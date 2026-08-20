// Core re-export
export * from '@betrix/core';

// Identity Bounded Context
export * from './identity/entities/User.js';
export * from './identity/entities/Session.js';
export * from './identity/entities/Device.js';
export * from './identity/value-objects/Email.js';
export * from './identity/value-objects/Password.js';
export * from './identity/value-objects/DeviceFingerprint.js';
export * from './identity/value-objects/SessionToken.js';
export * from './identity/services/LoginPolicy.js';
export * from './identity/services/DeviceDomainService.js';
export * from './identity/repositories/IUserRepository.js';
export * from './identity/repositories/ISessionRepository.js';
export * from './identity/repositories/IDeviceRepository.js';
export * from './identity/repositories/ILoginAttemptRepository.js';
export * from './identity/repositories/IVerificationRepository.js';
export * from './identity/repositories/IEphemeralStores.js';
export * from './identity/events/index.js';

// Intelligence Bounded Context
export * from './intelligence/entities/ChatMessage.js';
export * from './intelligence/entities/CreditTransaction.js';
export * from './intelligence/entities/CreditVoucher.js';
export * from './intelligence/entities/AiAgent.js';
export * from './intelligence/services/ModelPolicy.js';
export * from './intelligence/services/ThinkingFilter.js';
export * from './intelligence/services/IndicatorCalculator.js';
export * from './intelligence/services/PromptTemplateRegistry.js';
export * from './intelligence/repositories/IChatRepository.js';
export * from './intelligence/repositories/ICreditRepository.js';
export * from './intelligence/repositories/IVoucherRepository.js';
export * from './intelligence/repositories/IAiAgentRepository.js';
export * from './intelligence/ports/IAiGateway.js';
export * from './intelligence/events/ChatMessageStreamedEvent.js';

// Market Bounded Context
export * from './market/entities/Symbol.js';
export * from './market/entities/OHLCBar.js';
export * from './market/services/BrokerTimeCalculator.js';
export * from './market/services/MarketTimeCalculator.js';
export * from './market/repositories/IMarketRepositories.js';
export * from './market/ports/IMarketProviders.js';

// News Bounded Context
export * from './news/entities/NewsArticle.js';
export * from './news/services/NewsTagging.js';
export * from './news/repositories/INewsInterfaces.js';

// Messaging Bounded Context
export * from './messaging/entities/Message.js';
export * from './messaging/repositories/IMessageRepository.js';

// Admin Bounded Context
export * from './admin/entities/AdminAction.js';
export * from './admin/repositories/IAdminRepositories.js';

// Shared Kernel
export * from './shared/events/EventDispatcher.js';
export * from './shared/ports/INotifier.js';
