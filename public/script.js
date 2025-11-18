const inputBox = document.getElementById("inputBox");
const output = document.getElementById("output");

const btnIngredients = document.getElementById("fromIngredients");
const btnDish = document.getElementById("fromDish");
const btnRandom = document.getElementById("random");

let loadingInterval;

// Disable/enable all buttons
function setButtonsEnabled(enabled) {
  [btnIngredients, btnDish, btnRandom].forEach(btn => {
    btn.disabled = !enabled;
  });
}

// Animated loading message
function startLoadingAnimation() {
  const messages = [
    "🍳 Searching for the perfect recipe...",
    "👨‍🍳 Consulting with our AI chef...",
    "📝 Writing down the ingredients...",
    "🔥 Preparing cooking instructions...",
    "✨ Adding final touches..."
  ];
  
  let index = 0;
  output.textContent = messages[0];
  
  loadingInterval = setInterval(() => {
    index = (index + 1) % messages.length;
    output.textContent = messages[index];
  }, 2000);
}

function stopLoadingAnimation() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
  }
}

// Send prompt to backend server
async function ask(prompt) {
  output.style.opacity = "0.6";
  setButtonsEnabled(false);
  startLoadingAnimation();

  const startTime = Date.now();

  try {
    const res = await fetch("/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!res.ok) {
      throw new Error(data.error || data.details || "Failed to generate recipe");
    }

    stopLoadingAnimation();
    output.textContent = data.recipe || "No recipe found.";
    output.style.opacity = "1";
    
    console.log(`✅ Recipe generated in ${elapsedTime}s`);

  } catch (err) {
    stopLoadingAnimation();
    
    let errorMessage = `❌ Error: ${err.message}\n\n`;
    
    if (err.message.includes("Failed to fetch")) {
      errorMessage += "⚠️ Cannot connect to server.\nMake sure:\n• Server is running (npm start)\n• Server is on http://localhost:3000";
    } else if (err.message.includes("API key")) {
      errorMessage += "⚠️ Check your .env file:\n• OPENAI_API_KEY is set correctly\n• No extra spaces in the key";
    } else if (err.message.includes("Rate limit")) {
      errorMessage += "⏱️ Too many requests.\nPlease wait a minute and try again.";
    } else if (err.message.includes("timeout")) {
      errorMessage += "⏱️ OpenAI is taking too long.\nTry a simpler recipe or try again.";
    } else {
      errorMessage += "💡 Try:\n• Refreshing the page\n• Checking your internet connection\n• Trying a different recipe";
    }
    
    output.textContent = errorMessage;
    output.style.opacity = "1";
    console.error("Error details:", err);
    
  } finally {
    setButtonsEnabled(true);
  }
}

// Event Listeners
btnIngredients.addEventListener("click", () => {
  const ingredients = inputBox.value.trim();
  if (!ingredients) {
    alert("⚠️ Please enter some ingredients first.");
    return;
  }
  ask(`Create a recipe using: ${ingredients}. Include ingredients with amounts and clear cooking steps.`);
});

btnDish.addEventListener("click", () => {
  const dish = inputBox.value.trim();
  if (!dish) {
    alert("⚠️ Please enter a dish name first.");
    return;
  }
  ask(`Give me a recipe for ${dish}. Include ingredients with measurements and step-by-step instructions.`);
});

btnRandom.addEventListener("click", () => {
  ask("Create a unique, creative recipe. Include the dish name, ingredients, and cooking steps.");
});

// Allow Enter key to trigger "Generate from Dish Name"
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !btnDish.disabled) {
    btnDish.click();
  }
});

// Check server health on load
window.addEventListener("load", async () => {
  try {
    const res = await fetch("/health");
    if (res.ok) {
      console.log("✅ Server is healthy");
    }
  } catch (err) {
    output.textContent = "⚠️ Cannot connect to server.\n\nPlease make sure the server is running:\n\n  npm start\n\nThen refresh this page.";
    output.style.opacity = "1";
  }
});