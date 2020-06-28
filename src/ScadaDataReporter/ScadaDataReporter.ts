import axios from 'axios';
import { GatewayData } from '../GatewayData';
import { IGatewayReportData, IInfoName } from '../types';
import { IotHub, IIotHubConfig, GatewayDevice } from '..';
import { IotHub as IotHubEndpoints } from '../Endpoint'

export enum ScadaDataReporterProtocol {
  HTTPS = "HTTPS",
  MQTTS = "MQTTS"
}

const DETAULT_CONFIG: IScadaDataReporterConfig = {
  protocol: ScadaDataReporterProtocol.HTTPS,
  endpoint: IotHubEndpoints.Virginia,
  apiVersion: "20200519"
}

export interface IScadaDataReporterConfig {
  protocol: ScadaDataReporterProtocol,
  endpoint: string;
  apiVersion?: string;

  mqttConfig?: {
    topic: string;
    provisionCertPath?: string;
    provisionKeyPath?: string;
    provisionTemplateName: string;
    certPath: string;
    keyPath: string;
    rootCaPath: string;
    device: GatewayDevice.Types.IGatewayDeviceProp
  },
}

export class ScadaDataReporter {
  protected scadaAppId?: string;
  protected secret?: string;
  protected iotHub?: IotHub

  config: IScadaDataReporterConfig

  constructor(config: IScadaDataReporterConfig = DETAULT_CONFIG) {
    this.config = config
    this.init()
  }

  init() {
    switch (this.config.protocol) {
      case ScadaDataReporterProtocol.HTTPS:
        break;
      case ScadaDataReporterProtocol.MQTTS:
        if (this.config.mqttConfig === undefined) {
          throw new Error("Need provide mqtt config to use MQTT protocol")
        }

        const { device, certPath, keyPath, rootCaPath, provisionCertPath,
          provisionKeyPath, provisionTemplateName } = this.config.mqttConfig
        const config: IIotHubConfig = {
          endpoint: this.config.endpoint,
          device,
          certPath,
          keyPath,
          rootCaPath,
          provisionCertPath,
          provisionKeyPath,
          provisionTemplateName,
        }

        this.iotHub = new IotHub(config)
        break;
    }
  }

  setEndpoint(endpoint: string) {
    this.config.endpoint = endpoint
  }

  newGatewayData(gatewayPhysicalId: string): GatewayData {
    return new GatewayData(gatewayPhysicalId);
  }

  setScadaId(scadaAppId: string) {
    this.scadaAppId = scadaAppId;
  }

  setSecret(secret: string) {
    this.secret = secret;
  }

  valid(): Promise<boolean> {
    if (this.scadaAppId === undefined) {
      return Promise.reject('scadaId is undefined');
    }

    if (this.secret === undefined) {
      return Promise.reject('secret is undefined');
    }

    return Promise.resolve(true);
  }

  async register(reportData: GatewayData): Promise<any> {
    if (this.config.protocol !== ScadaDataReporterProtocol.HTTPS) {
      throw new Error("register has to be used with HTTPS protocol setting")
    }

    try {
      this.valid();
      const metricDatas = reportData.toMetricDatas();
      const gatewatReportData: IGatewayReportData = {
        Version: this.config.apiVersion,
        ScadaAppId: this.scadaAppId,
        Timestamp: new Date(),
        GatewayPhysicalId: reportData.getGatewayPhysicalId(),
        Secret: this.secret,
        MetricData: metricDatas,
        InfoData: {
          Name: IInfoName.REGISTER,
          Message: 'Register gateway',
        },
      };

      const res = await httpPost(`${this.config.endpoint}/gateway`, gatewatReportData);
      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async send(gatewayData: GatewayData): Promise<void> {
    try {
      this.valid();
      const gatewatReportData = this.getReportData(gatewayData)

      switch (this.config.protocol) {
        case ScadaDataReporterProtocol.HTTPS:
          await httpPost(`${this.config.endpoint}/gateway`, gatewatReportData);
          break;
        case ScadaDataReporterProtocol.MQTTS:
          if (this.iotHub) {
            let connection;
            if (!this.iotHub.deviceConnection) {
              connection = await this.iotHub.connect()
            } else {
              connection = this.iotHub.deviceConnection
            }

            connection!.publish('TOPIC', JSON.stringify(gatewatReportData))

          } else {
            throw new Error("Unexpected error, iotHub is not initialized")
          }
      }

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getReportData(gatewayData: GatewayData): IGatewayReportData {
    const metricDatas = gatewayData.toMetricDatas();
    const gatewatReportData: IGatewayReportData = {
      Version: this.config.apiVersion,
      ScadaAppId: this.scadaAppId,
      Timestamp: new Date(),
      GatewayPhysicalId: gatewayData.getGatewayPhysicalId(),
      Secret: this.secret,
      MetricData: metricDatas,
    };

    return gatewatReportData
  }
}

async function httpPost(url: string, rdata: any): Promise<any> {
  const result = await axios.post(url, rdata);
  const { data, status } = result
  console.log(status, data);
}