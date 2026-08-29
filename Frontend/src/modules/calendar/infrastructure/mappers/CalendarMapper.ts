import { CalendarEvent, type CalendarEventProps } from '../../domain/entities/CalendarEvent';

export class CalendarMapper {
  public static toDomain(dto: unknown): CalendarEvent {
    const d = dto as CalendarEventProps;
    return new CalendarEvent({
      id: d.id,
      currency: d.currency || 'USD',
      eventCode: d.eventCode,
      eventName: d.eventName || '',
      referencePeriodDate: d.referencePeriodDate,
      announcementUnix: d.announcementUnix,
      announcementDatetimeUtc: d.announcementDatetimeUtc,
      announcementDatetimeLocal: d.announcementDatetimeLocal,
      importance: d.importance || 'low',
      marketTier: d.marketTier ?? 3,
      isTopTier: d.isTopTier,
      sourceName: d.sourceName,
      sourceUrl: d.sourceUrl,
      beforeValue: d.beforeValue,
      forecastValue: d.forecastValue,
      forecastType: d.forecastType,
      actualValue: d.actualValue,
      hasOfficialForecast: d.hasOfficialForecast,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    });
  }

  public static toDomainList(dtos: unknown[]): CalendarEvent[] {
    return (dtos || []).map(CalendarMapper.toDomain);
  }
}
