export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);

  let r = '+' + d[0];
  if (d.length > 1) r += ' ' + d.slice(1, 4);
  if (d.length > 4) r += ' ' + d.slice(4, 7);
  if (d.length > 7) r += ' ' + d.slice(7, 9);
  if (d.length > 9) r += ' ' + d.slice(9, 11);
  return r;
}

export function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('7');
}
