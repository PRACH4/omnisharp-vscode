/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import CSharpDefinitionProvider from "../../src/features/definitionProvider";
import * as path from "path";
import testAssetWorkspace from "./testAssets/testAssetWorkspace";
import { expect, should } from "chai";
import { activateCSharpExtension, isRazorWorkspace, isSlnWithGenerator, restartOmniSharpServer } from './integrationHelpers';

suite(`${CSharpDefinitionProvider.name}: ${testAssetWorkspace.description}`, () => {
    let fileUri: vscode.Uri;

    suiteSetup(async function () {
        should();

        if (isRazorWorkspace(vscode.workspace) || isSlnWithGenerator(vscode.workspace)) {
            this.skip();
        }

        const activation = await activateCSharpExtension();
        await testAssetWorkspace.restore();

        const fileName = 'definition.cs';
        const projectDirectory = testAssetWorkspace.projects[0].projectDirectoryPath;
        fileUri = vscode.Uri.file(path.join(projectDirectory, fileName));
        await vscode.commands.executeCommand("vscode.open", fileUri);

        await testAssetWorkspace.waitForIdle(activation.eventStream);
    });

    suiteTeardown(async () => {
        await testAssetWorkspace.cleanupWorkspace();
    });

    test("Returns the definition", async () => {
        const definitionList = <vscode.Location[]>(await vscode.commands.executeCommand("vscode.executeDefinitionProvider", fileUri, new vscode.Position(10, 31)));
        expect(definitionList.length).to.be.equal(1);
        expect(definitionList[0]).to.exist;
        expect(definitionList[0].uri.path).to.contain("definition.cs");
    });

    test("Returns the definition from Metadata", async () => {
        const omnisharpConfig = vscode.workspace.getConfiguration('omnisharp');
        await omnisharpConfig.update('enableDecompilationSupport', false, vscode.ConfigurationTarget.Global);
        await restartOmniSharpServer();

        const definitionList = <vscode.Location[]>(await vscode.commands.executeCommand("vscode.executeDefinitionProvider", fileUri, new vscode.Position(10, 25)));
        expect(definitionList.length).to.be.equal(1);
        expect(definitionList[0]).to.exist;
        expect(definitionList[0].uri.path).to.contain("[metadata] Console.cs");
    });

    test("Returns multiple definitions for partial types", async () => {
        const definitionList = <vscode.Location[]>(await vscode.commands.executeCommand("vscode.executeDefinitionProvider", fileUri, new vscode.Position(4, 25)));
        expect(definitionList.length).eq(2);
        expect(definitionList[0]).to.exist;
        expect(definitionList[0].uri.path).to.contain("definition.cs");
        expect(definitionList[1]).to.exist;
        expect(definitionList[1].uri.path).to.contain("definition.cs");
    });

    suiteTeardown(async () => {
        await testAssetWorkspace.cleanupWorkspace();
    });
});
