/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
    //return `./data/restaurants.json`;
  }
  static get REVIEW_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}`;
    //return `./data/restaurants.json`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let dbPromise = idb.open("restaurantDb", 1, function(upgradeDb) {
      console.log("making a new object store");
      if (!upgradeDb.objectStoreNames.contains("restaurant")) {
        upgradeDb.createObjectStore("restaurant", { keyPath: "id" });
      }
    });
    dbPromise
      .then(function(db) {
        let tx = db.transaction("restaurant", "readonly");
        let store = tx.objectStore("restaurant");
        return store.getAll();
      })
      .then(function(restaurants) {
        //check for availability of data in indexeddb and return it
        if (restaurants.length !== 0) {
          callback(null, restaurants);
        } else {
          // No data, attempt a fetch
          fetch(DBHelper.DATABASE_URL)
            .then(response => {
              return response.json();
            })
            .then(restaurants => {
              dbPromise
                .then(function(db) {
                  let tx = db.transaction("restaurant", "readwrite");
                  let restaurantStore = tx.objectStore("restaurant");

                  for (let restaurant of restaurants) {
                    restaurantStore.put(restaurant);
                  }

                  return tx.complete;
                })
                .then(function() {
                  console.log("added item to restaurant!");
                })
                .catch(function(error) {
                  console.log(error);
                })
                .finally(function(error) {
                  callback(null, restaurants);
                });
            });
        }
      });
  }

  static restaurantToDb(restaurants) {
    let request = window.indexedDB.open("resDB", 1);
    request.onupgradeneeded = e => {
      let db = request.result;
      let store = db.createObjectStore("resStore", { keyPath: "id" });
    };
    request.onsuccess = e => {
      let db = request.result;
      let tx = db.transaction("resStore", "readwrite");
      let store = tx.objectStore("resStore");
      restaurants.forEach(restaurant => {
        store.put(restaurant);
      });
    };
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          // Got the restaurant
          callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback("Restaurant does not exist", null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph}.jpg`;
  }
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  static fetchReviews(restaurant, callback) {
    let dbPromise = idb.open("restaurantDb", 2, function(upgradeDb) {
      console.log("making a new object store");
      if (!upgradeDb.objectStoreNames.contains("reviewStore")) {
        upgradeDb.createObjectStore("reviewStore", { keyPath: "id" });
      }
    });
    dbPromise
      .then(function(db) {
        let tx = db.transaction("reviewStore");
        let store = tx.objectStore("reviewStore");
        return store.getAll();
      })
      .then(reviews => {
        if (reviews && reviews.length > 0) {
          callback(null, reviews);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const urlId = urlParams.get("id");
          fetch(`${DBHelper.REVIEW_URL}/reviews?restaurant_id=${urlId}`)
            .then(response => {
              return response.json();
            })
            .then(reviews => {
              console.log(reviews);
              dbPromise.then(function(db) {
                if (!db) return;
                let tx = db.transaction("reviewStore", "readwrite");
                let store = tx.objectStore("reviewStore");

                reviews.forEach(review => {
                  store.put(review);
                });
              });
              callback(null, reviews);
            })
            .catch(error => {
              callback(error, null);
            });
        }
      });
  }
}
