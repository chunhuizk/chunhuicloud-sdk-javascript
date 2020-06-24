import { IotHub, IIotHubConfig } from '../index'
import * as path from 'path'
import * as fs from 'fs';

test('IotHub Provision', () => {
    const config: IIotHubConfig = {
        deviceId: 'test-id',
        certFolderPath: path.join(__dirname, 'cert'),
        certPath: path.join(__dirname, 'provision_cert', 'p.pem'),
        keyPath: path.join(__dirname, 'provision_cert', 'p.private.key'),
    }
    const newIotHub = new IotHub(config)

    expect(newIotHub.isProvision).toBe(true);
});

test('IotHub Provision2', () => {
    const config: IIotHubConfig = {
        deviceId: 'test-id',
        certFolderPath: path.join(__dirname, 'data', 'mock_cert_folder'),
        certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'p.pem'),
        keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'p.private.key'),
    }
    const newIotHub = new IotHub(config)

    expect(newIotHub.isProvision).toBe(false);
});