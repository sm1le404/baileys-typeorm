import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
  proto,
} from '@whiskeysockets/baileys';
import { DataSourceOptions } from 'typeorm';
import BaileysDataSource from './db';
import { Auth } from './entity/auth';

const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  'pre-key': 'preKeys',
  session: 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory',
};

export const useAuthStateWithTypeOrm = async (
  dataSourceOption: DataSourceOptions,
  clientKey: string,
  tablePrefix: string = 'baileys_',
): Promise<{
  state: AuthenticationState;
  saveState: () => Promise<any>;
}> => {
  const dataSource = await BaileysDataSource.getInstance({
    ...dataSourceOption,
    entityPrefix: tablePrefix,
  });

  const authRepository = await dataSource.getRepository(Auth);
  let creds: AuthenticationCreds;
  let keys: any = {};

  const existingAuth = await authRepository.findOneBy({
    key: clientKey,
  });
  ({ creds, keys } =
    existingAuth && existingAuth.value
      ? JSON.parse(existingAuth.value, BufferJSON.reviver)
      : {
          creds: initAuthCreds(),
          keys: {},
        });

  const saveState = () =>
    authRepository.upsert(
      {
        key: clientKey,
        value: JSON.stringify({ creds, keys }, BufferJSON.replacer, 2),
      },
      {
        conflictPaths: ['key'],
      },
    );

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type];
          return ids.reduce((dict, id) => {
            let value = keys[key]?.[id];
            if (value) {
              if (type === 'app-state-sync-key')
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              dict[id] = value;
            }
            return dict;
          }, {});
        },
        set: async (data) => {
          for (const currentKey in data) {
            const key = KEY_MAP[currentKey as keyof SignalDataTypeMap];
            keys[key] = keys[key] || {};
            Object.assign(keys[key], data[currentKey]);
          }

          await saveState();
        },
      },
    },
    saveState,
  };
};
