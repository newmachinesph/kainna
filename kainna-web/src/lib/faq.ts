/** Home page questions, shown in the FAQ and published as FAQPage structured data. */
export const faqQuestions = (catalogCount: number, recipeCount: number) => [
  {
    id: "recipes",
    question: "Does every food image have a recipe?",
    answer: `The collection currently has ${catalogCount.toLocaleString()} unique dish images and ${recipeCount.toLocaleString()} in-app recipes with ingredients and steps. Other food pages include a link to the publisher's recipe when the catalog provides one.`,
  },
  {
    id: "prices",
    question: "Are the recipe prices live market prices?",
    answer: "No. The costs are estimates based on the app’s ingredient price list. They help you compare meals and plan a budget, but your local palengke prices may differ.",
  },
  {
    id: "plan",
    question: "What happens after I make a meal plan?",
    answer: "You get seven days of dishes and a grouped palengke list based on the plan. You can swap meals and check off what you need to buy.",
  },
  {
    id: "saved",
    question: "Do I need an account to save recipes?",
    answer: "No. As a guest, your saved recipes stay in this browser. If you create an account, Kain Na! stores them in your account so you can sign in again.",
  },
];
