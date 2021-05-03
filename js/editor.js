const vscode = acquireVsCodeApi();

//----- VSCode post message handlers -----
$(document).ready(function () {
    $(window).on("message", onWindowMessageHandler);
    $("#browseWorkspace").click(onBrowseWorkspaceHandler);
    $("#loadModulesBtn").click(onLoadModulesHandler);
    $("#importProjectBtn").click(onImportProjectHandler);
    $("input#useSelected").click(onFilterChange);
    $("input#filterModules").on("input", onFilterChange);
    $("#resetFilter").click(onResetFilter);
});

function onWindowMessageHandler (event) {
    const message = event.originalEvent.data; // The JSON data our extension sent

    switch (message.command) {
        case 'setworkspace': {
            clearModules();
            setLocation("workspaceLocation", message);
            break;
        }
        case 'settarget': {
            setLocation("targetLocation", message);
            break;
        }
        case 'listModules': {
            clearModules();
            loadingOff();
            listModules(message);
            break;
        }
    }
}

function onBrowseHandler (cmd) {
    vscode.postMessage({
        command: cmd
    });
}

function onBrowseWorkspaceHandler () {
    onBrowseHandler('browseWorkspace');
}

function onLoadModulesHandler () {
    const sourceLocation = document.getElementById("workspaceLocation").value;
    loadingOn();
    vscode.postMessage({
        command: 'loadModules',
        source: sourceLocation
    });
}

function onImportProjectHandler () {
    const modules = [];
    const sourceLocation = $("#workspaceLocation").val();
    const topLevel = $("div#moduleList > ul");
    collectModules(topLevel, modules);
    vscode.postMessage({
        command: 'importProject',
        source: sourceLocation,
        modules: modules
    });
}

function onFilterChange () {
    const topLevel = $("div#moduleList > ul");
    let filter = $("input#filterModules").val().toLowerCase().trim();
    const useSelected = $("input#useSelected").prop("checked");
    if ((filter && filter.length > 0) || (true === useSelected)) {
        filterModules(topLevel, filter, useSelected);
    } else {
        resetFilteredModules();
    }
}

function onResetFilter () {
    clearFilter();
    resetFilteredModules();
}
//-----------------------------------------

function resetFilteredModules () {
    const topLevel = $("div#moduleList > ul");
    topLevel.find("li").each(function () {
        $(this).removeClass("filtered-out");
    });
}

function onSetWorkspaceHandler (message) {
    console.log('on set workspace');
    clearModules();
    setLocation("workspaceLocation", message);
};

function disableImportBtn (enabled) {
    $("#importProjectBtn").attr("disabled", enabled);
}

function disableFilterSet (enabled) {
    $("input#filterModules").attr("disabled", enabled);
    $("#resetFilter").attr("disabled", enabled);
    $("input#useSelected").attr("disabled", enabled);
}

function clearFilter () {
    $("input#filterModules").val("");
    $("input#useSelected").prop("checked", false);
}

function clearModules () {
    $("#moduleList").empty();
    disableImportBtn(true);
    disableFilterSet(true);
    clearFilter();
}

function setLocation (elementId, message) {
    if (message.data !== null) {
        $("#" + elementId).val(message.data);
    } else {
        $("#" + elementId).val('');
    }
}

function onClickExpandHandle (event) {
    event.stopPropagation();
    const element = $(event.target);
    element.toggleClass("collapsed");
    element.toggleClass("expanded");
    element.parent().children("ul").toggleClass("collapsed-list");
}

function listModules (message) {
    const modules = message.data;
    if (modules !== null) {
        if (modules.length > 0) {
            disableImportBtn(false);
            disableFilterSet(false);
            const topList = $("<ul></ul>").appendTo("div#moduleList");
            for (i = 0; i < modules.length; i++) {
                addNode(modules[i], topList);
            }
        }
    }
}

function addNode (module, parentNode) {
    if (module) {
        const moduleName = module.name;
        const modulePath = module.path;
        const moduleId = "moduleList-" + modulePath;
        const hasChild = (module.nested && module.nested.length > 0);

        const liNode = $("<li></li>").appendTo(parentNode);

        const spanNode = $("<span></span>").appendTo(liNode);
        if (true === hasChild) {
            spanNode.addClass("collapsed");
            spanNode.click(onClickExpandHandle);
        } else {
            spanNode.addClass("single");
        }

        const cbNode = $('<input type="checkbox" />').appendTo(liNode);
        cbNode.attr("id", moduleId);
        cbNode.attr("name", moduleName);
        cbNode.attr("value", modulePath);

        if (module.selected) {
            cbNode.prop("checked", true);
        }
        $(document.createTextNode(moduleName)).appendTo(liNode);

        if (hasChild) {
            const nestedUlNode = $('<ul></ul>').appendTo(liNode);
            nestedUlNode.toggleClass("collapsed-list");
            for (j = 0; j < module.nested.length; j++) {
                addNode(module.nested[j], nestedUlNode);
            }
        }
    }
}

function filterModules (parentNode, filter, useSelected) {
    let filtered = false;
    parentNode.children("li").each(function () {
        const cbNode = $(this).children("input").first();
        let filteredModule = cbNode.attr("name").toLowerCase().includes(filter);
        if (true === useSelected) {
            filteredModule = filteredModule && cbNode.prop("checked");
        }
        const nested = $(this).children("ul").first();
        if (nested && nested.length) {
            const nestedFiltered = filterModules(nested, filter, useSelected);
            filteredModule = (filteredModule || nestedFiltered);
        }
        filtered = (filtered || filteredModule);
        if (true === filteredModule) {
            $(this).removeClass("filtered-out");
        } else {
            $(this).addClass("filtered-out");
        }

    });
    return filtered;
}

function collectModules (parentNode, modules) {
    parentNode.children("li").each(function () {
        const cbNode = $(this).children("input").first();
        const module = buildNode(cbNode);
        modules.push(module);
        if (true === module.selected) {
            includeParent($(this), modules, modules.length - 1);
        }
        const nested = $(this).children("ul").first();
        if (nested && nested.length) {
            collectModules(nested, modules);
        }
    });
}

function includeParent (childNode, modules, index) {
    const parentNode = childNode.parent().closest("li");
    if (parentNode && parentNode.length) {
        const cbNode = parentNode.children("input").first();
        const selected = cbNode.prop("checked");
        if (!selected) {
            const modulePath = cbNode.val();
            for (i = index; i > 0; i--) {
                if (modules[i - 1].path === modulePath) {
                    modules[i - 1].selected = true;
                    cbNode.prop("checked", true);
                    includeParent(parentNode, modules, i);
                    break;
                }
            }
        }
    }
}

function buildNode (cboxNode) {
    const moduleName = cboxNode.attr("name");
    const modulePath = cboxNode.val();
    const selected = cboxNode.prop("checked");
    const module = {
        name: moduleName,
        selected: selected,
        path: modulePath
    };
    return module;
}

function loadingOn () {
    $("div#moduleList").before('<div id="loadingWindow"><span class="loading">Loading modules ...</span></div>');
}

function loadingOff () {
    $("div#loadingWindow").remove();

}
