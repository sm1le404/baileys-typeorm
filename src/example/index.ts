import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { useAuthStateWithTypeOrm } from '../index';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Boom } from '@hapi/boom';

const startSocket = async () => {
  const clientId = '123'; // random
  const { state, saveState } = await useAuthStateWithTypeOrm(
    {
      type: 'sqlite',
      database: 'db.sqlite',
    },
    clientId,
  );
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
  });
  sock.ev.process(async (events) => {
    if (events['creds.update']) await saveState();

    if (events['connection.update']) {
      const update = events['connection.update'];
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        if (
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          await startSocket();
        } else {
          console.log('Connection closed. You are logged out.');
        }
      }
    }
  });
};

startSocket();
