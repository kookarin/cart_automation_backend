const { Builder, By, Key, until } = require('selenium-webdriver');

const chrome = require('selenium-webdriver/chrome');

const { supabase } = require('./services/db');
require('dotenv').config(); // Load environment variables

const chromeDriverPath = process.env.CHROME_DRIVER_PATH;
const userName = process.env.USER_NAME; // users computer profile name
const profileName = process.env.PROFILE_NAME; // users chrome profile name

// Convert the self-executing function to a named exported function
async function zeptoOrder(houseId) {  // Add parameters as needed
    console.log('Code started');
    // fetch data from picklist
    const groceryPicklist = await supabase
        .from('grocery_picklist_p2')
        .select('*, house!inner(delivery_ph_no,id)')
        .eq('house_id', houseId)  // Use the passed houseId
        .eq('is_ordered', false)
        .eq('platform', 'Zepto')
        ;
// creating a list of ingredients
    console.log(groceryPicklist.data);
    let ingredients = [];
    for (let a = 0; a < groceryPicklist.data.length; a++) {
      ingredients.push(groceryPicklist.data[a].ingredient_id);
    }

// creating a user level ordering list
    let listOfOrders = [];
    for (let a = 0; a < groceryPicklist.data.length; a++) {
      let ingredient_id = groceryPicklist.data[a].ingredient_name;
      let ingredient_url = groceryPicklist.data[a].ingredient_url;
      let ingredient_packSize = groceryPicklist.data[a].ingredient_packSize;
      let required_qty = groceryPicklist.data[a].required_qty;
      let phone_number = 'Test';
      let house_id = groceryPicklist.data[a].house_id;

      const phoneNumberExists = listOfOrders.find(order => order.phone_number === phone_number);

      // Use an if clause to determine the result
      if (phoneNumberExists) {
        let foundOrder = listOfOrders.find(order => order.phone_number === phone_number);

        if (foundOrder) {
          let jsonObject = {
            "ingredient_id": ingredient_id,
            "ingredient_url": ingredient_url,
            "ingredient_packSize": ingredient_packSize,
            "required_qty": required_qty,
          }
          foundOrder.items.push(jsonObject);
        } else {
            Promise.resolve();
        }      } else {
          let jsonObject = {
            "phone_number": phone_number,
            "house_id": house_id,
            "items": [
              {
                "ingredient_id": ingredient_id,
                "ingredient_url": ingredient_url,
                "ingredient_packSize": ingredient_packSize,
                "required_qty": required_qty,
              }
            ]
          }
          listOfOrders.push(jsonObject);
      }
    }
    console.log(listOfOrders); // print user level order list [{ phone_number: '8130422398', items: [ [Object], [Object] ] }]




// master for loop for placing each ordering
    for (let b = 0; b < 1; b++) {  // ############################33 change this to place multiple orders
    // for (let b = 0; b < listOfOrders.length; b++) {
      let phone_number = listOfOrders[b].phone_number;
      let house_id = listOfOrders[b].house_id;
      let listOfItems = listOfOrders[b].items;
      let itemList = listOfItems;

      let addressIdentifier = `${phone_number}`; // user name on bigbasket

      let productNotFound = [];

      const options = new chrome.Options();
      options.addArguments(`user-data-dir=C:\\Users\\${userName}\\AppData\\Local\\Google\\Chrome\\User Data`); // Path to user data
      options.addArguments(`--profile-directory=${profileName}`); // Specify your profile name

      // Initialize the WebDriver with the specified options
      let driver = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .build();

      try {
  // Address selection

          let websiteUrl = 'https://www.zeptonow.com/';

          await driver.get(websiteUrl);
          await driver.sleep(4000);

          // Find the button using XPath
          // await driver.wait(until.elementLocated(By.xpath("//button[@data-testid='manual-address-btn']")), 2000);
          //
          // let selectAddress = await driver.findElement(By.xpath("//button[@data-testid='manual-address-btn']"));

          await driver.wait(until.elementLocated(By.xpath("//button//span[@data-testid='user-address']")), 2000);

          let selectAddress = await driver.findElement(By.xpath("//button//span[@data-testid='user-address']"));

          await driver.executeScript("arguments[0].click();", selectAddress);

          await driver.sleep(2000);

          // select address
          // await driver.wait(until.elementLocated(By.xpath("//div[@data-testid='address-item']")), 2000);
          //
          // let savedLocation = await driver.findElement(By.xpath("//div[@data-testid='address-item']"));
          //
          // await driver.executeScript("arguments[0].click();", savedLocation);

          let adressSelectionButton = await driver.findElement(By.xpath(`//h4[contains(text(), '${addressIdentifier}')]`));
          const parentDiv1 = await adressSelectionButton.findElement(By.xpath(".."));
          const parentDiv2 = await parentDiv1.findElement(By.xpath(".."));
          await driver.executeScript("arguments[0].click();", parentDiv2);
          // await adressSelectionButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

  // Adding items to cart
          for (let i = 0; i < itemList.length; i++) {
            let ingredient_name = itemList[i].ingredient_id;
            let productUrl = itemList[i].ingredient_url;
            let productPackSize = itemList[i].ingredient_packSize;
            let productQty = itemList[i].required_qty;
            console.log(itemList[i]);
            await driver.get(productUrl);

            try {
              // Add to cart
              let addButtonXPath = `(//button[contains(text(), 'Add To Cart')])`;
              await driver.wait(until.elementsLocated(By.xpath(addButtonXPath)), 5000);
              let addToCartButton = await driver.findElement(By.xpath(addButtonXPath));
              await driver.sleep(2000);
              await driver.executeScript("arguments[0].click();", addToCartButton);


              // Increase productQty
              for (let j = 1; j < productQty; j++) {
                await driver.wait(until.elementsLocated(By.xpath("//button[@aria-label='Increase quantity by 1']")), 5000);
                let increaseButton = await driver.findElement(By.xpath("//button[@aria-label='Increase quantity by 1']"));
                await driver.executeScript("arguments[0].click();", increaseButton);
              }


              // update the record in grocery_picklist
              await supabase
                .from('grocery_picklist_p2') // Specify the table name
                .update({ is_ordered: true }) // Set is_ordered to true
                .eq('house_id', house_id) // Condition for house_id
                .eq('ingredient_name', ingredient_name)
                .eq('platform', 'Zepto')
                .eq('is_ordered', false)
              ;


              // upload record to grocery_platform_order #################################
              const newEntry = {
                platform: 'Zepto',
                ingredient_id: ingredient_id,
                house_id: house_id,
                pack_size: extractFirstNumber(productPackSize), // extract number
                qty: productQty
              };

              await supabase
                .from('grocery_platform_order')
                .insert([newEntry]);

            } catch (error) {
              console.log(error);
// product is Out of stock
              productNotFound.unshift(productUrl);
            }
          }
  // take user to cart page
          let cartURL = 'https://www.zeptonow.com/account/addresses?cart=open';
          await driver.get(cartURL);
  // Log not found item
          console.log(productNotFound);
          console.log('Code Ended');

      } catch (error) {
          console.error(`Error: ${error}`);
      } finally {
          // Close the browser after a delay
          setTimeout(() => driver.quit(), 2000);
      }
    }
    console.log('Code ended');
}

// Export the function
module.exports = {
    zeptoOrder
};

function convertToGrams(weight) {
    // Use a regular expression to match the input format
    const regex = /^(\d+\.?\d*)\s*(kg|g|gm|L|ml|ps|pcs|pc|piece|pieces)$/i; // Matches '2 kg', '50 g', etc.
    const match = weight.match(regex);

    if (match) {
        const value = parseFloat(match[1]); // Extract the numeric part
        const unit = match[2].toLowerCase(); // Extract the unit and convert to lowercase

        if (unit === 'kg' || unit === 'l' || unit === 'ps' || unit === 'pcs' || unit === 'pc' || unit === 'piece' || unit === 'pieces') {
            return value * 1000; // Convert kg to grams
        } else if (unit === 'g' || unit === 'ml' || unit === 'gm') {
            return value; // Return grams as is
        }
    } else {
        console.log(`error parsing -  ${weight}`);
        throw new Error(`Invalid input format. Please use "X kg" or "X g" or "X L" or "X ml"`);
    }
}

function extractFirstNumber(text) {
    const match = text.match(/-?\d+(\.\d+)?/);
    return match ? match[0] : null; // Return the first match or null if none found
};

function removeTextUntilFirstSpace(text) {
    const firstSpaceIndex = text.indexOf(' ');
    return firstSpaceIndex !== -1 ? text.substring(firstSpaceIndex + 1) : text;
};

function extractDecimalAsInteger(number) {
    // Multiply the number by 100
    let multiplied = number * 100;

    // Extract the integer part
    let integerPart = Math.floor(multiplied);

    // Calculate the decimal part
    let decimalPart = multiplied - integerPart;

    // Convert the decimal part to an integer (by multiplying by 10^n, where n is the number of decimal places)
    let decimalAsInteger = Math.round(decimalPart * 100); // Multiply by 100 to shift two decimal places

    return decimalAsInteger;
}
