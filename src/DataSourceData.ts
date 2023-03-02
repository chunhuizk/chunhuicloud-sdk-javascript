import { IDimension, IMetricData, IMeta } from './types';

export class DataSourceData {
  protected value?: number;
  protected values: number[] = [];
  protected counts: number[] = [];
  protected dimentions: IDimension[] = [];
  protected metas: IMeta[] = [];
  protected timestamp?: Date;

  readonly DATASOURCE_DIMENTION_KEY = 'DataSourceId';

  constructor(dataSourceId: string) {
    this.setDataSourceId(dataSourceId);
  }

  public setValue(val: number, frequence?: number): void {
    if (frequence) {
      this.values.push(val);
      this.counts.push(frequence);
    } else {
      if (this.values) {
        this.values = [];
        this.counts = [];
      }
      this.value = val;
    }
  }

  public setVariation(name: string, value: string) {
    this.setDimention(name, value);
  }

  public setMeta(name: string, value: string) {
    if (name === '' || value === '') {
      throw new Error('name or value shoud not be empty');
    }

    this.metas.push({
      Name: name,
      Value: value,
    });
  }

  private setDimention(name: string, value: string) {
    if (name === '' || value === '') {
      throw new Error('name or value shoud not be empty');
    }

    this.dimentions.push({
      Name: name,
      Value: value,
    });
  }

  setDataSourceId(did: string) {
    this.setDimention(this.DATASOURCE_DIMENTION_KEY, did);
  }

  setTimestamp(t: Date) {
    this.timestamp = t;
  }

  toMetricData(): IMetricData {
    const {
      value: Value,
      values: Values,
      counts: Counts,
      timestamp: Timestamp,
      dimentions: Dimensions,
      metas: Metas,
    } = this;
    if (Values && Values.length > 0) {
      return { Values, Counts, Timestamp: Timestamp || new Date(), Dimensions, Metas };
    } else {
      return { Value, Timestamp: Timestamp || new Date(), Dimensions, Metas };
    }
  }
}
