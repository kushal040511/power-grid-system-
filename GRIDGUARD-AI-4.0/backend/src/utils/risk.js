export const riskClass = (theftProbability) => {
  if (theftProbability > 70) return "red";
  if (theftProbability >= 40) return "yellow";
  return "green";
};
