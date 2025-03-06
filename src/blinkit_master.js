const { Builder, By, Key, until } = require('selenium-webdriver');

const chrome = require('selenium-webdriver/chrome');

const { supabase } = require('./services/db');
require('dotenv').config(); // Load environment variables

const chromeDriverPath = process.env.CHROME_DRIVER_PATH;
const userName = process.env.USER_NAME; // users computer profile name
const profileName = process.env.PROFILE_NAME; // users chrome profile name

// Convert self-executing function to named exported function
async function blinkitOrder(houseId) {
    console.log('Code started');
// fetch data from picklist
const groceryPicklist = await supabase
    .from('grocery_picklist_p2')
    .select('*, house!inner(delivery_ph_no,id)')
    .eq('house_id', houseId)
    .eq('platform', 'Blinkit')
    .eq('is_ordered', false)
    ;
console.log('groceryPicklist', groceryPicklist.data);
// creating a list of ingredients
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
        let multipack = groceryPicklist.data[a].multipack;
        let phone_number = groceryPicklist.data[a].house.delivery_ph_no;
        let house_id = groceryPicklist.data[a].house.id;

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
        "multipack": multipack,
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
            "multipack": multipack,
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
            let websiteUrl = 'https://blinkit.com/';

            await driver.get(websiteUrl);
            await driver.sleep(4000);

            // Find the button using XPath
            await driver.wait(until.elementLocated(By.xpath("//div[@class='LocationBar__SubtitleContainer-sc-x8ezho-9 jWpzvj']")), 2000);

            let selectAddress = await driver.findElement(By.xpath("//div[@class='LocationBar__SubtitleContainer-sc-x8ezho-9 jWpzvj']"));

            await driver.executeScript("arguments[0].click();", selectAddress);

            await driver.sleep(2000);

            // select address
            let adressSelectionButton = await driver.findElement(By.xpath(`//div[contains(text(), '${addressIdentifier}')]`));
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
                let multipack = itemList[i].multipack;
                await driver.get(productUrl);

                try {
                    // select the size
                    if (`${multipack}` === 'false') {
                        Promise.resolve();
                    } else {
                        let selectSizeXPath = `(//p[contains(text(), '${productPackSize}')])`;
                        await driver.wait(until.elementsLocated(By.xpath(selectSizeXPath)), 5000);
                        await driver.executeScript("arguments[0].click();", await driver.findElement(By.xpath(selectSizeXPath)));
                        await driver.sleep(2000);
                    }
                    // Add to cart
                    let addButtonXPath = `(//div[contains(text(), 'ADD')])`;
                    await driver.wait(until.elementsLocated(By.xpath(addButtonXPath)), 5000);
                    let addToCartButton = await driver.findElement(By.xpath(addButtonXPath));
                    await driver.executeScript("arguments[0].click();", addToCartButton);
                    await driver.sleep(2000);


              // Increase productQty
              for (let j = 1; j < productQty; j++) {
                await driver.wait(until.elementsLocated(By.xpath("//div[@class='AddToCart___StyledDiv2-sc-17ig0e3-11 hrkaxa']")), 5000);
                let increaseButton = await driver.findElement(By.xpath("//div[@class='AddToCart___StyledDiv2-sc-17ig0e3-11 hrkaxa']"));
                await driver.executeScript("arguments[0].click();", increaseButton);
              }

                    // update the record in grocery_picklist
                    await supabase
                        .from('grocery_picklist_p2') // Specify the table name
                        .update({ is_ordered: true }) // Set is_ordered to true
                        .eq('house_id', house_id) // Condition for house_id
                        .eq('ingredient_name', ingredient_name)
                        .eq('platform', 'Blinkit')
                        .eq('is_ordered', false)
                        ;

                    // upload record to grocery_platform_order #################################
                    const newEntry = {
                        platform: 'Blinkit',
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
            let cartDiv = "//div[@class='CartButton__Button-sc-1fuy2nj-5 joEvaa']";
            await driver.wait(until.elementsLocated(By.xpath(cartDiv)), 5000);
            let cartButton = await driver.findElement(By.xpath(cartDiv));
            await driver.executeScript("arguments[0].click();", cartButton);
    // Log not found item
            console.log(productNotFound);
            console.log('Code Ended');

        } catch (error) {
            console.error(`Error: ${error}`);
        } finally {
            // Close the browser after a delay
            setTimeout(() => driver.quit(), 5000);
        }
    }
    // console.log('Code ended');
}

// Export the function
module.exports = {
    blinkitOrder
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
