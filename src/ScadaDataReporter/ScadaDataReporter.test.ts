import { ScadaDataReporter, IScadaDataReporterConfig, ScadaDataReporterProtocol } from './ScadaDataReporter';
import { IotHub as IotHubEndpoints } from '../Endpoint'
import * as path from 'path'

test('ScadaDataReporter Default Config', () => {
    const reporter = new ScadaDataReporter()

    expect(reporter.config.protocol).toBe("HTTPS")
    expect(reporter.config.endpoint).toBeTruthy()
    expect(reporter.config.apiVersion).toBeTruthy()
    expect(reporter.config.mqttConfig).toBeUndefined()
});

test('ScadaDataReporter Https Data Process', () => {
    const reporter = new ScadaDataReporter()
    const GatewayPhysicalId = "12345"
    const SensorOneId = "abcde"
    const mockValue = 100
    const gatewayData = reporter.newGatewayData(GatewayPhysicalId)
    const sensorData1 = gatewayData.newDataSourceData(SensorOneId)
    const timestampDate = new Date()
    sensorData1.setValue(mockValue)
    sensorData1.setTimestamp(timestampDate);

    expect(sensorData1.toMetricData()).toStrictEqual({
        Dimensions:[{Name: "DataSourceId", Value: SensorOneId}],
        Metas: [],
        Timestamp: timestampDate,
        Value: mockValue
    })

    expect(gatewayData.countDataSourceData()).toBe(1)

    expect(gatewayData.toMetricDatas()).toStrictEqual([{
        Dimensions:[{Name: "DataSourceId", Value: SensorOneId}],
        Metas: [],
        Timestamp: timestampDate,
        Value: mockValue
    }])
});

test('ScadaDataReporter Mqtt Config Without Provision', () => {
    const testTopic = "test/message"
    const mockDevice = {
        SerialNumber: 'test-id',
        Model: 'Test'
    }

    const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
        protocol: ScadaDataReporterProtocol.MQTTS,
        endpoint: IotHubEndpoints.Virginia,
        apiVersion: "20200519",
        mqttConfig: {
            topic: testTopic,
            device: mockDevice,
            rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
            certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.cert.pem'),
            keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'provision.private.key'),
        }
    }
    const reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig)

    expect(reporter.config.protocol).toBe("MQTTS")
    expect(reporter.config.endpoint).toBeTruthy()
    expect(reporter.config.apiVersion).toBeTruthy()
    expect(reporter.config.mqttConfig).toBeTruthy()
    expect(reporter.getIotHub()).toBeTruthy()
    expect(reporter.getIotHub()!.isProvision).toBe(false)
});

test('ScadaDataReporter Mqtt Config With Provision', () => {
    const testTopic = "test/message"
    const mockDevice = {
        SerialNumber: 'test-id',
        Model: 'Test'
    }

    const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
        protocol: ScadaDataReporterProtocol.MQTTS,
        endpoint: IotHubEndpoints.Virginia,
        apiVersion: "20200519",
        mqttConfig: {
            topic: testTopic,
            device: mockDevice,
            provisionTemplateName: 'faketemplatename',
            provisionCertPath: path.join(__filename), // mock path for exist check
            provisionKeyPath: path.join(__filename), // mock path for exist check
            rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
            certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'nonexist.cert.pem'),
            keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'nonexist.private.key'),
        }
    }
    const reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig)

    expect(reporter.config.protocol).toBe("MQTTS")
    expect(reporter.config.endpoint).toBeTruthy()
    expect(reporter.config.apiVersion).toBeTruthy()
    expect(reporter.config.mqttConfig).toBeTruthy()
    expect(reporter.getIotHub()).toBeTruthy()
    expect(reporter.getIotHub()!.isProvision).toBe(true)
});