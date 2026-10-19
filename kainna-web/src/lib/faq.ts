/** Home page questions, shown in the FAQ and published as FAQPage structured data. */
export const faqQuestions = (catalogCount: number, recipeCount: number) => [
  {
    id: "recipes",
    question: "Does every dish have a recipe?",
    answer: `Most do: ${recipeCount.toLocaleString()} of the ${catalogCount.toLocaleString()} dishes have a full recipe here with ingredients and steps. For the rest, the dish page links to the publisher's original recipe when there is one.`,
  },
  {
    id: "prices",
    question: "Are the recipe prices live market prices?",
    answer: "No, the prices are estimates, not live quotes. They come from a wet-market price list, so your own palengke may be cheaper or pricier. Use them to compare dishes and plan a budget.",
  },
  {
    id: "plan",
    question: "What happens after I make a meal plan?",
    answer: "You get seven days of ulam and one palengke list for the whole week. The list is grouped by stall, you can swap any dish, and you can tick off items as you buy them.",
  },
  {
    id: "saved",
    question: "Do I need an account to save recipes?",
    answer: "No, you can save recipes as a guest, and they stay in this browser. If you sign in, Kain Na! keeps them in your account so they are there on any device.",
  },
];
