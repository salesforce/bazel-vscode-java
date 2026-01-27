import opentelemetry, { Counter, Meter, Tracer } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
	defaultResource,
	Resource,
	resourceFromAttributes,
} from '@opentelemetry/resources';
import {
	ConsoleMetricExporter,
	MeterProvider,
	PeriodicExportingMetricReader,
	PushMetricExporter,
} from '@opentelemetry/sdk-metrics';
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
	SpanExporter,
	WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
	ExtensionContext,
	TextDocument,
	workspace,
	WorkspaceConfiguration,
} from 'vscode';

interface Headers {
	[key: string]: string;
}

const DEFAULT_ENDPOINT = 'http://localhost:4318';
const DEFAULT_HEADERS = {} as Headers;

export class ExtensionOtel {
	private static _instance: ExtensionOtel;
	private _config: WorkspaceConfiguration;
	private _context: ExtensionContext;
	private _resource: Resource;
	private _traceExporter: SpanExporter;
	private _metricExporter: PushMetricExporter;
	private _traceProvider: WebTracerProvider;
	private _meterProvider: MeterProvider;
	private _tracer: Tracer;
	private _meter: Meter;
	private _fileOpenCounter: Counter;
	private _fileSaveCounter: Counter;

	private constructor(ctx: ExtensionContext) {
		this._context = ctx;
		this._config = workspace.getConfiguration('bazel.telemetry');
		this._resource = defaultResource().merge(
			resourceFromAttributes({
				[ATTR_SERVICE_NAME]: ctx.extension.packageJSON.name,
				[ATTR_SERVICE_VERSION]: ctx.extension.packageJSON.version,
			})
		);
		this._traceExporter = new OTLPTraceExporter({
			url: `${this.endpoint}/v1/traces`,
			headers: this.headers,
		});
		this._metricExporter = new OTLPMetricExporter({
			url: `${this.endpoint}/v1/metrics`,
			headers: this.headers,
		});

		this._traceProvider = new WebTracerProvider({
			resource: this._resource,
			spanProcessors: [
				new BatchSpanProcessor(this._traceExporter),
				new BatchSpanProcessor(new ConsoleSpanExporter()),
			],
		});
		this._traceProvider.register();

		this._meterProvider = new MeterProvider({
			resource: this._resource,
			readers: [
				new PeriodicExportingMetricReader({
					exporter: this._metricExporter,
				}),
				new PeriodicExportingMetricReader({
					exporter: new ConsoleMetricExporter(),
				}),
			],
		});

		opentelemetry.metrics.setGlobalMeterProvider(this._meterProvider);

		this._tracer = opentelemetry.trace.getTracer(
			ctx.extension.packageJSON.name
		);
		this._meter = opentelemetry.metrics.getMeter(
			ctx.extension.packageJSON.name
		);

		this._fileOpenCounter = this._meter.createCounter('file.opened', {
			unit: 'lang',
		});
		this._fileSaveCounter = this._meter.createCounter('file.saved', {
			unit: 'lang',
		});
	}

	private get endpoint() {
		if (this._config.get('endpoint')) {
			return this._config.get<string>('endpoint', DEFAULT_ENDPOINT);
		}
		return process.env.OTEL_EXPORTER_OTLP_ENDPOINT
			? process.env.OTEL_EXPORTER_OTLP_ENDPOINT
			: DEFAULT_ENDPOINT;
	}

	private get headers() {
		if (this._config.get('headers')) {
			return this._config.get<Headers>('headers', DEFAULT_HEADERS);
		}

		return process.env.OTEL_EXPORTER_OTLP_HEADERS
			? process.env.OTEL_EXPORTER_OTLP_HEADERS.trim()
					.split(',')
					.reduce((acc, val) => {
						const [k, v] = val.split('=');
						acc[k.trim()] = v.trim();
						return acc;
					}, DEFAULT_HEADERS)
			: DEFAULT_HEADERS;
	}

	public static getInstance(ctx: ExtensionContext): ExtensionOtel {
		if (!this._instance) {
			this._instance = new ExtensionOtel(ctx);
		}
		return this._instance;
	}

	public get tracer(): Tracer {
		return this._tracer;
	}

	public get meter(): Meter {
		return this._meter;
	}

	public get fileOpenCounter() {
		return this._fileOpenCounter;
	}

	public get fileSaveCounter() {
		return this._fileSaveCounter;
	}
}

export function registerMetrics(context: ExtensionContext) {
	workspace.onDidOpenTextDocument((e: TextDocument) => {
		ExtensionOtel.getInstance(context).fileOpenCounter.add(1, {
			lang: e.languageId,
		});
	});

	workspace.onDidSaveTextDocument((e: TextDocument) => {
		ExtensionOtel.getInstance(context).fileSaveCounter.add(1, {
			lang: e.languageId,
		});
	});
}
