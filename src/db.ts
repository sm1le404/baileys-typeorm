import { DataSource, DataSourceOptions, Repository } from 'typeorm';
import { Auth } from './entity/Auth';

class BaileysDataSource {
  protected static instance: DataSource;

  static async getInstance(
    dataSourceOptions: DataSourceOptions,
  ): Promise<Repository<Auth>> {
    if (!BaileysDataSource.instance) {
      BaileysDataSource.instance = await new DataSource({
        ...dataSourceOptions,
        entities: [Auth, ...((dataSourceOptions.entities as any) || [])],
      } as any).initialize();
      await BaileysDataSource.instance.synchronize(false);
    }

    return BaileysDataSource.instance.getRepository(Auth);
  }
}

export default BaileysDataSource;
