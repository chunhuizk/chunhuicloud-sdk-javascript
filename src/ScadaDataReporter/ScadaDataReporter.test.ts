import { ScadaDataReporter, IScadaDataReporterConfig, ScadaDataReporterProtocol } from './ScadaDataReporter';
import { IotHub as IotHubEndpoints } from '../Endpoint';
import * as path from 'path';
import { GatewayData } from '../GatewayData';
import { getAWSRootCertificatePath } from '..';

test('ScadaDataReporter Default Config', () => {
  const reporter = new ScadaDataReporter();

  expect(reporter.config.protocol).toBe('HTTPS');
  expect(reporter.config.endpoint).toBeTruthy();
  expect(reporter.config.apiVersion).toBeTruthy();
  expect(reporter.config.mqttConfig).toBeUndefined();
});

test('ScadaDataReporter Https Data Process', () => {
  const reporter = new ScadaDataReporter();
  const GatewayPhysicalId = '12345';
  const SensorOneId = 'abcde';
  const mockValue = 100;
  const gatewayData = reporter.newGatewayData(GatewayPhysicalId);
  const sensorData1 = gatewayData.newDataSourceData(SensorOneId);
  const timestampDate = new Date();
  sensorData1.setValue(mockValue);
  sensorData1.setTimestamp(timestampDate);

  expect(sensorData1.toMetricData()).toStrictEqual({
    Dimensions: [{ Name: 'DataSourceId', Value: SensorOneId }],
    Metas: [],
    Timestamp: timestampDate,
    Value: mockValue,
  });

  expect(gatewayData.countDataSourceData()).toBe(1);

  expect(reporter.generateReportData(gatewayData)).toHaveLength(1);

  expect(gatewayData.toMetricDatas()).toStrictEqual([
    {
      Dimensions: [{ Name: 'DataSourceId', Value: SensorOneId }],
      Metas: [],
      Timestamp: timestampDate,
      Value: mockValue,
    },
  ]);
});

test('ScadaDataReporter Mqtt init() fail scenario', async () => {
  const testTopic = 'ping';
  const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test',
  };

  const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: '20200519',
  };
  expect(() => {
    const test = new ScadaDataReporter(scadaDataReporterMqttsConfig);
  }).toThrowError('Need provide mqtt config to use MQTT protocol');
});

test('ScadaDataReporter Mqtt init() success scenario', async () => {
  const testTopic = 'ping';
  const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test',
  };

  const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: '20200519',
    mqttConfig: {
      topic: testTopic,
      device: mockDevice,
      certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
      keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
      rootCaPath: getAWSRootCertificatePath(),
    },
  };

  console.log(getAWSRootCertificatePath());
  const _ = new ScadaDataReporter(scadaDataReporterMqttsConfig);
});

test('ScadaDataReporter Mqtt register()', async () => {
  const testTopic = 'test/message';
  const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test',
  };

  const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: '20200519',
    mqttConfig: {
      topic: testTopic,
      device: mockDevice,
      rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
      certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
      keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    },
  };
  const reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig);

  expect(reporter.config.protocol).toBe('MQTTS');
  await expect(reporter.register(new GatewayData('123'))).rejects.toStrictEqual(
    new Error('register has to be used with HTTPS protocol setting'),
  );
});

test('ScadaDataReporter Mqtt Config Without Provision', () => {
  const testTopic = 'test/message';
  const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test',
  };

  const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: '20200519',
    mqttConfig: {
      topic: testTopic,
      device: mockDevice,
      rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
      certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
      keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    },
  };
  const reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig);

  expect(reporter.config.protocol).toBe('MQTTS');
  expect(reporter.config.endpoint).toBeTruthy();
  expect(reporter.config.apiVersion).toBeTruthy();
  expect(reporter.config.mqttConfig).toBeTruthy();
  expect(reporter.getIotHub()).toBeTruthy();
  expect(reporter.getIotHub()!.isProvision).toBe(false);
});

test('ScadaDataReporter Mqtt Config With Provision', () => {
  const testTopic = 'test/message';
  const mockDevice = {
    SerialNumber: 'test-id',
    Model: 'Test',
  };

  const scadaDataReporterMqttsConfig: IScadaDataReporterConfig = {
    protocol: ScadaDataReporterProtocol.MQTTS,
    endpoint: IotHubEndpoints.Ningxia,
    apiVersion: '20200519',
    mqttConfig: {
      topic: testTopic,
      device: mockDevice,
      provisionTemplateName: 'faketemplatename',
      provisionCertPath: path.join(__filename), // mock path for exist check
      provisionKeyPath: path.join(__filename), // mock path for exist check
      rootCaPath: path.join(process.cwd(), 'src', 'rootCertificates', 'AmazonRootCA1.pem'),
      certPath: path.join(__dirname, 'data', 'mock_cert_folder', 'nonexist.cert.pem'),
      keyPath: path.join(__dirname, 'data', 'mock_cert_folder', 'nonexist.private.key'),
    },
  };
  const reporter = new ScadaDataReporter(scadaDataReporterMqttsConfig);

  expect(reporter.config.protocol).toBe('MQTTS');
  expect(reporter.config.endpoint).toBeTruthy();
  expect(reporter.config.apiVersion).toBeTruthy();
  expect(reporter.config.mqttConfig).toBeTruthy();
  expect(reporter.getIotHub()).toBeTruthy();
  expect(reporter.getIotHub()!.isProvision).toBe(true);
});

test('Test datasourceData set exceed 20 limit', () => {
  const reporter = new ScadaDataReporter();
  const GatewayPhysicalId = '12345';
  const gatewayData = reporter.newGatewayData(GatewayPhysicalId);

  for (const i of [...Array(23).keys()]) {
    const sensorData = gatewayData.newDataSourceData(`Sensor_${i}`);
    const timestampDate = new Date();
    sensorData.setValue(i * 10);
    sensorData.setTimestamp(timestampDate);
  }

  expect(gatewayData.countDataSourceData()).toBe(23);
  expect(reporter.generateReportData(gatewayData)).toHaveLength(2);
  expect(reporter.generateReportData(gatewayData)[1].MetricData).toHaveLength(3);
});
