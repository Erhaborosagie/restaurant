class DBHelper {
  static get DATABASE_URL() {
    const port = 1337;
    return `http://localhost:${port}`;
  }
  static get dbPromise() {
    return idb.open("restaurantDb", 1, function(upgradeDb) {
      console.log("making new object stores");
      upgradeDb.createObjectStore("restaurant", { keyPath: "id" });
      upgradeDb.createObjectStore("reviewStore", { keyPath: "updatedAt" });
      upgradeDb.createObjectStore("offlineReviews", { keyPath: "updatedAt" });
    });
  }
  static fetchRestaurants(callback) {
    DBHelper.dbPromise
      .then(function(db) {
        let tx = db.transaction("restaurant", "readonly");
        let store = tx.objectStore("restaurant");
        return store.getAll();
      })
      .then(function(restaurants) {
        if (restaurants.length !== 0) {
          callback(null, restaurants);
        } else {
          fetch(`${DBHelper.DATABASE_URL}/restaurants`)
            .then(response => {
              return response.json();
            })
            .then(restaurants => {
              DBHelper.dbPromise
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
  static fetchRestaurantById(id, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          callback(null, restaurant);
        } else {
          callback("Restaurant does not exist", null);
        }
      }
    });
  }
  static fetchRestaurantByCuisine(cuisine, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }
  static fetchNeighborhoods(callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }
  static fetchCuisines(callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }
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
    DBHelper.dbPromise
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
          fetch(`${DBHelper.DATABASE_URL}/reviews?restaurant_id=${urlId}`)
            .then(response => {
              return response.json();
            })
            .then(reviews => {
              DBHelper.dbPromise.then(function(db) {
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
  static lateSubmission() {
    DBHelper.dbPromise.then(db => {
      const tx = db.transaction("offlineReviews");
      const store = tx.objectStore("offlineReviews");
      store.getAll().then(lateItems => {
        if (lateItems.length !== 0) {
          lateItems.forEach(review => {
            fetch("http://localhost:1337/reviews/", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(review)
            })
              .then(res => res.json())
              .then(data => {
                DBHelper.dbPromise.then(function(db) {
                  let tx = db.transaction("reviewStore", "readwrite");
                  let store = tx.objectStore("reviewStore");
                  store.put(data);
                  DBHelper.clearLateItems();
                });
              })
              .catch(err => {
                console.log("Still no network");
              });
          });
        }
      });
    });
  }
  static clearLateItems() {
    DBHelper.dbPromise.then(db => {
      const tx = db.transaction("offlineReviews", "readwrite");
      const store = tx.objectStore("offlineReviews").clear();
    });
    return;
  }
}
