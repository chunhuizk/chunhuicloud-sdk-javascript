import * as https from 'https';
import { GatewayData } from './GatewayData';
import { IGatewayReportData, IInfoName } from './types';

export class Scada {
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

  async send(reportData: GatewayData): Promise<void> {
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
      };

      const res = await httpPost(`${this.endpoint}/gateway`, gatewatReportData);
      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

function httpPost(url: string, rdata: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObject = new URL(url);
    const data = JSON.stringify(rdata);
    console.log(urlObject.hostname);

    const options = {
      hostname: urlObject.hostname,
      port: urlObject.port,
      path: urlObject.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res: any) => {
      console.log(`statusCode: ${res.statusCode}`);

      // if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
      //     return httpPost(res.headers.location, rdata)
      // }
      // cumulate data
      let body: any = [];

      res.on('data', (chunk: any) => {
        body.push(chunk);
      });

      res.on('end', () => {
        try {
          body = body.join();
        } catch (e) {
          reject(e);
        }
        resolve(body);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}
