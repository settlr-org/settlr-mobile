export const formatMoney = (amount: number) =>
  `NPR ${new Intl.NumberFormat("en-IN").format(amount)}`;
