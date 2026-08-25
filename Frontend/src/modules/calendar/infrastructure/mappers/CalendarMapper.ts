import { CalendarEvent } from '../../domain/entities/CalendarEvent';

export class CalendarMapper {
  public static toDomain(dto: any): CalendarEvent {
    return new CalendarEvent({
      id: dto.id,
      currency: dto.currency || 'USD',
      eventCode: dto.eventCode,
      eventName: dto.eventName || '',
      referencePeriodDate: dto.referencePeriodDate,
      announcementUnix: dto.announcementUnix,
      announcementDatetimeUtc: dto.announcementDatetimeUtc,
      announcementDatetimeLocal: dto.announcementDatetimeLocal,
      importance: dto.importance || 'low',
      marketTier: dto.marketTier ?? 3,
      isTopTier: dto.isTopTier,
      sourceName: dto.sourceName,
      sourceUrl: dto.sourceUrl,
      beforeValue: dto.beforeValue,
      forecastValue: dto.forecastValue,
      forecastType: dto.forecastType,
      actualValue: dto.actualValue,
      hasOfficialForecast: dto.hasOfficialForecast,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    });
  }

  public static toDomainList(dtos: any[]): CalendarEvent[] {
    return (dtos || []).map(CalendarMapper.toDomain);
  }
}
