import axios from 'axios';
import { GatewayData } from './GatewayData';
import { IGatewayReportData, IInfoName } from './types';

export class ScadaDataReporter {
  protected scadaAppId?: string;
  protected secret?: string;
  apiVersion = '20200519';
  endpoint = 'https://{scadaId}.scada.chunhuicloud.com';

  constructor(apiVersion?: string, endpoint?: string) {
    this.apiVersion = apiVersion || this.apiVersion;
    this.endpoint = endpoint || this.endpoint;
  }

  newGatewayData(gatewayPhysicalId: string): GatewayData {
    return new GatewayData(gatewayPhysicalId);
  }

  setScadaId(scadaAppId: string) {
    this.scadaAppId = scadaAppId;
    this.endpoint = this.endpoint.replace('{scadaId}', scadaAppId);
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
    try {
      this.valid();
      const metricDatas = reportData.toMetricDatas();
      const gatewatReportData: IGatewayReportData = {
        Version: this.apiVersion,
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

      const res = await httpPost(`${this.endpoint}/gateway`, gatewatReportData);
      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async send(gatewayData: GatewayData): Promise<void> {
    try {
      this.valid();
      const gatewatReportData = this.getReportData(gatewayData)

      const res = await httpPost(`${this.endpoint}/gateway`, gatewatReportData);
      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getReportData(gatewayData: GatewayData): IGatewayReportData {
    const metricDatas = gatewayData.toMetricDatas();
    const gatewatReportData: IGatewayReportData = {
      Version: this.apiVersion,
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
  const {data, status} = result
  console.log(status, data);
}
