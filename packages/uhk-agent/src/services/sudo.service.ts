import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as sudo from 'sudo-prompt';

import { IpcEvents, LogService, IpcResponse } from 'uhk-common';

export class SudoService {

    constructor(private logService: LogService,
                private rootDir: string) {

        this.logService.info('[SudoService] App root dir: ', this.rootDir);
        ipcMain.on(IpcEvents.device.setPrivilegeOnLinux, this.setPrivilege.bind(this));
    }

    public async setPrivilegOnWindows(): Promise<void> {
        const scriptPath = path.join(this.rootDir, 'rules/wdi-simple.exe');

        await this.runSudoCommand(scriptPath);
    }

    private setPrivilege(event: Electron.Event) {
        switch (process.platform) {
            case 'linux':
                this.setPrivilegeOnLinux(event);
                break;
            default:
                const response: IpcResponse = {
                    success: false,
                    error: {message: 'Permissions couldn\'t be set. Invalid platform: ' + process.platform}
                };

                event.sender.send(IpcEvents.device.setPrivilegeOnLinuxReply, response);
                break;
        }
    }

    private async setPrivilegeOnLinux(event: Electron.Event): Promise<void> {
        const scriptPath = path.join(this.rootDir, 'rules/setup-rules.sh');
        const command = `sh ${scriptPath}`;
        const response = new IpcResponse();

        try {
            await this.runSudoCommand(command);
            response.success = true;
        } catch (error) {
            response.success = false;
            response.error = error;
        }

        event.sender.send(IpcEvents.device.setPrivilegeOnLinuxReply, response);
    }

    private async runSudoCommand(command: string) {
        this.logService.debug(`[SudoService] run command: ${command}`);

        return new Promise((resolve, reject) => {
            const options = {
                name: 'Setting UHK access rules'
            };
            sudo.exec(command, options, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}
