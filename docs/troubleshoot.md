# Troubleshoot

## Expected UI

If this Bazel Java extension managed to correctly configure your workspace, then:

* The _Explorer_ view will have a _Java Projects_ tab
* The _Java Projects_ will contain a _Bazel dependencies_ in addition to the _JRE System Library_
* The _Java Projects_ will **NOT** contain _Referenced Libraries_ after the _JRE System Library_
* When a `X.java` editor is open, then the status bar should show _{ } Java_ (**NOT** {·} or _✈️_ for [Lightweight Java Mode](https://code.visualstudio.com/docs/java/java-project#_lightweight-mode))
* Run (Alt/Cmd+Shift+P) the _Java: Configure Java Runtime_ command; the _Type_ should be _Unmanaged folder,_ **NOT** _Maven_ or _Gradle._
* Run the _Java: Configure Classpath_ command; the _Sources_ should include the correct paths

Note that VSC only starts to initialize things when you open the first `.java` file/s.
So it's normal in VSC for e.g. _Sources_ to get "gradually initialized" as you open more Java files.

## Hard Reset

1. Close (all of) your VSC windows
1. `killall java` (check that `jps` only shows _Jps_ itself)
1. `cd YOURPROJECT`
1. `bazel build //...` must first work, obviously (double check!)
1. `code .`
1. Double check that the [the extension](vscode:extension/sfdc.bazel-vscode-java) is installed **and not disabled**
1. Run (Alt/Cmd+Shift+P) the _Java: Clean Java Language Server Workspace_ command (this clears the Logs, see below)
1. Open (Ctrl-P) any `X.java` file in the editor (this is required to trigger the extension to kick in, see above)
1. Run the _Java: Show Build Job Status_ command, and wait for it to "quiet down" and everything in it to be `[Done]`
1. Run the _Java: Synchronize Projects with Bazel Project View_ command
1. Run the _Java: Refresh Classpath from Bazel BUILD file_ command

## Logs

Check out the following places for log-like details to spot any problems:

* As always, check the _Problems_ view; NB you can _Filter_ it for _Bazel._

* Run the _Java: Open All Log Files_ command to open the `.../redhat.java/jdt_ws/.metadata/.log`.

* The command above should also have opened the `client.log.YYYY-MM-DD`

Please attach (or copy/paste) all x3 if you file issues for support.
(Rename `.log` to e.g. `log.txt` and `client.log.YYYY-MM-DD` to e.g. `client.log.YYYY-MM-DD.json`
in order to be able to upload as attachment to GitHub issues.)

## Extensions

Please note that this _Bazel for Java_ extension (`sfdc.bazel-vscode-java`, which adds support for Bazel's **Java** rules to VSC), is technically completely independent of _[the VSC Bazel](https://marketplace.visualstudio.com/items?itemName=BazelBuild.vscode-bazel)_ extension (`BazelBuild.vscode-bazel`, which adds generic support for Bazel `BUILD` files editing, and "externally running" any Bazel targets; but specific nothing for Java).

It's therefore totally possible to run the former (this) without the latter.

When troubleshooting, it can sometimes be slightly confusing which extension issues what message. For example, notification pop ups with `Command failed: bazel (...)` errors are from the other extension, not this one.

If in doubt, it is therefore recommended to temporarily _Disable in Workspace_ that other Bazel extension when debugging problems with this extension.

## Java Version

```java
!ENTRY org.eclipse.jdt.ls.core 4 0 2024-01-05 12:39:25.798
!MESSAGE Error occured while building workspace. Details:
 message: Preview features enabled at an invalid source release level 11, preview can be enabled only at source level 21; code: 2098258; resource: /home/vorburger/git/github.com/vorburger/LearningBazel/java-one/src/main/java/ch/vorburger/learningbazel/Main.java;
```

This error (visible in `.log`) actually appears to be "harmless"; more background in [issue #74](https://github.com/salesforce/bazel-vscode-java/issues/74).

## Menus

If the _Synchronize Projects with Bazel View_ and _Refresh Classpath from Bazel BUILD file_
menus are not available on right-click on Folder, then the extension is not correct installed,
or has been manually disabled on the workspace.

## Bazelisk

```java
Error (...) Unable to detect Bazel version of binary 'bazel'!
Cannot run program "bazel": error=2, No such file or directory
java.io.IOException: Cannot run program "bazel": error=2, No such file or directory
 at java.base/java.lang.ProcessBuilder.start(ProcessBuilder.java:1143)
 at java.base/java.lang.ProcessBuilder.start(ProcessBuilder.java:1073)
 at com.salesforce.bazel.sdk.command.BazelBinaryVersionDetector.detectVersion(BazelBinaryVersionDetector.java:57)
 at com.salesforce.bazel.eclipse.core.extensions.DetectBazelVersionAndSetBinaryJob.run(DetectBazelVersionAndSetBinaryJob.java:52)
 at org.eclipse.core.internal.jobs.Worker.run(Worker.java:63)
Caused by: java.io.IOException: error=2, No such file or directory
```

The extension attempts to launch `bazel`, but it's not on your `$PATH`.

If you use [Bazelisk](https://github.com/bazelbuild/bazelisk) (which we recommend!),
make sure you have a _symlink_ from `bazel` to `bazelisk` on `$PATH`. On macOS,
Homebrew sets this up. On Linux, you need to [do this yourself e.g. in your dotfiles](https://github.com/vorburger/vorburger-dotfiles-bin-etc/commit/b8dea1dcf465db6f201d1cfa4302b748a08fc3b5).

Alternatively, add `bazel_binary: bazelisk` in the project's `.bazelproject` configuration file.

More background in [issue #477](https://github.com/salesforce/bazel-eclipse/issues/477).

## Maven or Gradle

If there is a _Build tool conflicts are detected in workspace. Which one would you like to use? Maven, or Gradle?_ pop-up:

Just click _Maven_ - and this extension will still correctly kick-in and initialize classpaths and source folders etc. from Bazel.

More background in [issue #82](https://github.com/salesforce/bazel-vscode-java/issues/82).

## Alternatives

To narrow down root causes of problems, it may be interesting to try opening the same project
using the [Bazel Eclipse Feature](https://github.com/salesforce/bazel-eclipse/blob/main/docs/bef/README.md)
and see if that works.
