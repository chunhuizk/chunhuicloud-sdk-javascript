import { IotHub, IIotHubConfig } from '../index'
import * as path from 'path'
import * as fs from 'fs';

test('IotHub Provision', () => {
    const config: IIotHubConfig = {
        deviceId: 'test-id',
        endpoint: 'fakeendpoint',
        provisionTemplateName: 'faketemplatename',
        rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
        provisionCertPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.cert.pem'),
        provisionKeyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.private.key'),
        certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'notexist.pem'),
        keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'notexist.private.key'),
    }

    const newIotHub = new IotHub(config)

    expect(newIotHub.isProvision).toBe(true);
});

test('IotHub Provision 2', () => {
    const config: IIotHubConfig = {
        deviceId: 'test-id',
        endpoint: 'fakeendpoint',
        provisionTemplateName: 'faketemplatename',
        rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
        certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'p.pem'),
        keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'p.private.key'),
    }
    const newIotHub = new IotHub(config)

    expect(newIotHub.isProvision).toBe(false);
});