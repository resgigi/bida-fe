import { registerPlugin } from '@capacitor/core';

const ThermalPrinter = registerPlugin('ThermalPrinter');

function uint8ToBase64(u8) {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

export async function thermalListPaired() {
  const { devices } = await ThermalPrinter.listPaired();
  return devices || [];
}

export async function thermalConnect(address) {
  await ThermalPrinter.connect({ address });
}

export async function thermalWriteBytes(bytes) {
  await ThermalPrinter.write({ data: uint8ToBase64(bytes) });
}

export async function thermalDisconnect() {
  await ThermalPrinter.disconnect();
}
