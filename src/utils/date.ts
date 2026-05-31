export class DateFormatter {
  static formatDateOnly(date: Date, language: string): string {
    const locale = language?.startsWith("de") ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  static formatTimeOnly(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  static formatDateTime(date: Date, language: string): string {
    return `${this.formatDateOnly(date, language)}\n${this.formatTimeOnly(date)}`;
  }
}
