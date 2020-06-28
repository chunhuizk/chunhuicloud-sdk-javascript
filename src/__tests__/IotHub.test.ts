import { IotHub, IIotHubConfig } from '../index'
import * as path from 'path'

test('IotHub Provision', () => {
    const config: IIotHubConfig = {
        device: {
            SerialNumber: 'test-id',
            Model: 'Test'
        },
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
        device: {
            SerialNumber: 'test-id',
            Model: 'Test'
        },
        endpoint: 'fakeendpoint',
        rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
        certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.cert.pem'),
        keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.private.key'),
    }

    let newIotHub: IotHub;

    expect(() => {
        new IotHub(config)
    }).not.toThrow()

    newIotHub = new IotHub(config)
    expect(newIotHub.isProvision).toBe(false);
});