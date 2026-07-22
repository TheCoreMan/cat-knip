import {
  Global,
  Inject,
  Injectable,
  Module,
  type CanActivate,
  type DynamicModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Injectable()
class WhiskerService {}

@Injectable()
class GroomingService {
  public constructor(public readonly whisker: WhiskerService) {}
}

@Module({
  exports: [GroomingService, WhiskerService],
  providers: [GroomingService, WhiskerService],
})
class GroomingModule {}

@Injectable()
class ShelterService {
  public constructor(public readonly grooming: GroomingService) {}
}

@Module({ imports: [GroomingModule], providers: [ShelterService] })
export class RedundantExportModule {}

const PURR_CLIENT = 'PURR_CLIENT';

@Module({
  exports: [PURR_CLIENT],
  providers: [{ provide: PURR_CLIENT, useValue: { purr: () => 'prrr' } }],
})
export class RedundantTokenModule {}

@Injectable()
class StrayCatService {}

@Module({ exports: [StrayCatService], providers: [StrayCatService] })
export class OrphanExportModule {}

@Injectable()
class ConsumedService {}

@Module({ exports: [ConsumedService], providers: [ConsumedService] })
class ConsumedProviderModule {}

@Injectable()
class ConstructorConsumer {
  public constructor(public readonly consumed: ConsumedService) {}
}

@Module({
  imports: [ConsumedProviderModule],
  providers: [ConstructorConsumer],
})
export class ConsumedExportModule {}

@Injectable()
class PropertyConsumer {
  @Inject(ConsumedService)
  public consumed!: ConsumedService;
}

@Module({
  imports: [ConsumedProviderModule],
  providers: [PropertyConsumer],
})
export class PropertyInjectModule {}

@Injectable()
class LitterService {}

@Global()
@Module({ exports: [LitterService], providers: [LitterService] })
class LitterModule {}

@Injectable()
class GlobalConsumer {
  public constructor(public readonly litter: LitterService) {}
}

@Module({ providers: [GlobalConsumer] })
class GlobalConsumerModule {}

@Module({ imports: [LitterModule, GlobalConsumerModule] })
export class GlobalConsumedModule {}

@Module({})
class EmptyModule {}

@Module({ exports: [EmptyModule], imports: [EmptyModule] })
export class ReExportModule {}

@Injectable()
class CatGuard implements CanActivate {
  public canActivate(): boolean {
    return true;
  }
}

@Module({ providers: [{ provide: APP_GUARD, useClass: CatGuard }] })
export class EnhancerModule {}

const CAT_A = 'CAT_A';
const CAT_B = 'CAT_B';

@Module({})
class DynamicCatModule {
  public static register(token: string): DynamicModule {
    return {
      exports: [token],
      module: DynamicCatModule,
      providers: [{ provide: token, useValue: token }],
    };
  }
}

@Injectable()
class DynamicCatConsumer {
  public constructor(@Inject(CAT_A) public readonly cat: string) {}
}

@Module({
  imports: [DynamicCatModule.register(CAT_A)],
  providers: [DynamicCatConsumer],
})
class DynamicCatConsumerModule {}

@Module({
  imports: [DynamicCatModule.register(CAT_B), DynamicCatConsumerModule],
})
export class DynamicModuleInstancesModule {}
