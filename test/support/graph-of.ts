import type { Type } from '@nestjs/common';
import { SerializedGraph } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { SerializedGraphJson } from '../../src';

export async function graphOf(
  rootModule: Type<unknown>,
): Promise<SerializedGraphJson> {
  const moduleReference = await Test.createTestingModule({
    imports: [rootModule],
  }).compile({ snapshot: true });

  try {
    return moduleReference.get(SerializedGraph).toJSON() as SerializedGraphJson;
  } finally {
    await moduleReference.close();
  }
}
