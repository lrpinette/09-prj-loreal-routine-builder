/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");

/* Ensure all DOM elements are properly referenced */
if (
  !categoryFilter ||
  !productsContainer ||
  !chatForm ||
  !chatWindow ||
  !selectedProductsList ||
  !generateRoutineButton
) {
  console.error(
    "One or more DOM elements could not be found. Please check your HTML structure."
  );
}

/* Track selected products */
let selectedProducts = [];

/* Track conversation history */
let conversationHistory = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    if (!response.ok) {
      throw new Error(`Failed to load products: ${response.statusText}`);
    }
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Unable to load products. Please try again later.
      </div>
    `;
    return [];
  }
}

/* Create HTML for displaying product cards with hover overlay */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to product cards
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      toggleProductSelection(card, products); // Pass the correct products array
    });
  });
}

/* Toggle product selection */
// This function moves selected products to the "Selected Products" section and updates the array.
function toggleProductSelection(card, products) {
  const productId = card.getAttribute("data-id");
  const product = products.find((p) => p.id === productId);

  if (selectedProducts.some((p) => p.id === productId)) {
    // Remove product from selected list
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
    card.classList.remove("selected");
  } else {
    // Add product to selected list
    selectedProducts.push(product);
    card.classList.add("selected");
  }

  // Update the "Selected Products" section and save to localStorage
  updateSelectedProducts();
  saveSelectedProducts();
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  const savedProducts = localStorage.getItem("selectedProducts");
  if (savedProducts) {
    selectedProducts = JSON.parse(savedProducts);
    updateSelectedProducts();
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Update the "Selected Products" section */
function updateSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product" data-id="${product.id}">
      <span>${product.name}</span>
      <button class="remove-btn">Remove</button>
    </div>
  `
    )
    .join("");

  // Add click event listeners to remove buttons
  const removeButtons = document.querySelectorAll(".remove-btn");
  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const productId = e.target
        .closest(".selected-product")
        .getAttribute("data-id");
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      document
        .querySelector(`.product-card[data-id="${productId}"]`)
        ?.classList.remove("selected");
      saveSelectedProducts();
      updateSelectedProducts();
    });
  });

  // Save the updated list to localStorage
  saveSelectedProducts();
}

/* Clear all selected products */
function clearSelectedProducts() {
  selectedProducts = [];
  document.querySelectorAll(".product-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });
  saveSelectedProducts();
  updateSelectedProducts();
}

/* Add a clear button to the "Selected Products" section */
const clearButton = document.createElement("button");
clearButton.textContent = "Clear All";
clearButton.className = "clear-btn";
clearButton.addEventListener("click", clearSelectedProducts);
document.querySelector(".selected-products").appendChild(clearButton);

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Display user message in the chat window
  chatWindow.innerHTML += `
    <div class="user-message">
      ${userInput}
    </div>
  `;

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userInput,
  });

  // Display a loading message
  chatWindow.innerHTML += `
    <div class="placeholder-message">
      Searching for the latest information...
    </div>
  `;

  try {
    // Send conversation history to your Cloudflare Worker
    const response = await fetch(
      "https://sweet-recipe-b45e.leorpinette.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o", // Using the specified model
          messages: [
            {
              role: "system",
              content:
                "You are a skincare and beauty routine advisor. Use real-time web search to provide the latest information about L'Oréal products, routines, and related topics. Include links or citations in your responses when applicable.",
            },
            ...conversationHistory,
          ],
        }),
      }
    );

    const result = await response.json();

    // Display the AI's response in the chat window
    if (result.choices && result.choices.length > 0) {
      const aiResponse = result.choices[0].message.content;
      chatWindow.innerHTML += `
        <div class="ai-response">
          ${aiResponse.replace(/\n/g, "<br>")}
        </div>
      `;

      // Add AI response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });
    } else {
      chatWindow.innerHTML += `
        <div class="placeholder-message">
          Sorry, I couldn't process your question. Please try again.
        </div>
      `;
    }
  } catch (error) {
    // Handle errors
    chatWindow.innerHTML += `
      <div class="placeholder-message">
        An error occurred while processing your question. Please try again later.
      </div>
    `;
    console.error("Error processing question:", error);
  }

  // Clear the input field
  document.getElementById("userInput").value = "";
});

/* Generate routine button click handler */
generateRoutineButton.addEventListener("click", async () => {
  // Check if there are selected products
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <div class="placeholder-message">
        Please select products to generate a routine.
      </div>
    `;
    console.warn("No products selected. Cannot generate a routine.");
    return;
  }

  // Prepare data for your Cloudflare Worker
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description || "No description available", // Handle missing descriptions
  }));

  console.log("Selected products for routine generation:", productData);

  // Display a loading message in the "Let's Build Your Routine" section
  chatWindow.innerHTML = `
    <div class="placeholder-message">
      Generating your personalized routine...
    </div>
  `;

  try {
    // Send data to your Cloudflare Worker
    const response = await fetch(
      "https://sweet-recipe-b45e.leorpinette.workers.dev", // Replace with your actual Cloudflare Worker URL
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o", // Using the specified model
          messages: [
            {
              role: "system",
              content: "You are a skincare and beauty routine advisor.",
            },
            {
              role: "user",
              content: `Create a personalized routine using these products: ${JSON.stringify(
                productData
              )}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();

    console.log("API response:", result);

    // Display the AI-generated routine in the "Let's Build Your Routine" section
    if (result.choices && result.choices.length > 0) {
      const routine = result.choices[0].message.content;
      chatWindow.innerHTML = `
        <div class="ai-response">
          ${routine.replace(/\n/g, "<br>")}
        </div>
      `;

      // Add the routine to the conversation history
      conversationHistory.push({
        role: "assistant",
        content: routine,
      });
    } else {
      chatWindow.innerHTML = `
        <div class="placeholder-message">
          Sorry, I couldn't generate a routine. Please try again.
        </div>
      `;
      console.warn("API response did not contain routine data.");
    }
  } catch (error) {
    // Handle errors
    chatWindow.innerHTML = `
      <div class="placeholder-message">
        An error occurred while generating the routine. Please try again later.
      </div>
    `;
    console.error("Error generating routine:", error);
  }
});

/* Function to set text direction based on language */
function setTextDirection(language) {
  const rtlLanguages = ["ar", "he", "fa", "ur"]; // List of RTL languages
  const isRTL = rtlLanguages.includes(language);
  document.body.setAttribute("dir", isRTL ? "rtl" : "ltr");
}

/* Load selected products on page load */
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedProducts();

  const userLanguage = navigator.language.slice(0, 2); // Get the user's language (e.g., "en", "ar")
  setTextDirection(userLanguage);
});
