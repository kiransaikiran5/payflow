export const currencySymbols: { [key: string]: string } = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const formatCurrency = (amount: number, currency: string = 'INR') => {
  const sym = currencySymbols[currency] || currency + ' ';
  return `${sym}${amount.toLocaleString()}`;
};