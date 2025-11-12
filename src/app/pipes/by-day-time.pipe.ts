import { Pipe, PipeTransform } from '@angular/core';
import { ScheduleItem } from '../models/schedule-item';

@Pipe({
  name: 'byDayTime',
  standalone: true
})
export class ByDayTimePipe implements PipeTransform {
  transform(items: ScheduleItem[], day: string, time: string): ScheduleItem[] {
    if (!items || !day || !time) {
      return [];
    }

    return items.filter(item => {
      // Check if the item occurs on this day
      const occursOnDay = item.repeats && item.repeatDays?.includes(day);
      
      if (!occursOnDay) {
        return false;
      }

      // Parse the time slot (e.g., "10:00")
      const [slotHour, slotMinute] = time.split(':').map(Number);
      const slotTime = slotHour * 60 + slotMinute;

      // Parse item start and end times
      const [startHour, startMinute] = (item.start || '00:00').split(':').map(Number);
      const [endHour, endMinute] = (item.end || '00:00').split(':').map(Number);
      
      const itemStart = startHour * 60 + startMinute;
      const itemEnd = endHour * 60 + endMinute;

      // Check if the slot time falls within the item's time range
      return slotTime >= itemStart && slotTime < itemEnd;
    });
  }
}
