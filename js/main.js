let restaurants, neighborhoods, cuisines;
var newMap;
var markers = [];
window.addEventListener("load", () => {
  initMap();
});
function showMap() {
  document.getElementById("map").style.display = "block";
  document.getElementById("map-container").style.display = "block";
}
document.addEventListener("DOMContentLoaded", event => {
  fetchNeighborhoods();
  fetchCuisines();
});
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");
  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};
function initMap() {
  let loc = { lat: 40.722216, lng: -73.987501 };
  self.map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: loc,
    scrollwheel: !1
  });
  updateRestaurants();
}
updateRestaurants = () => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");
  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;
  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        console.error(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
      }
    }
  );
};
resetRestaurants = restaurants => {
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById("restaurants-list");
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};
createRestaurantHTML = restaurant => {
  const url = `${DBHelper.DATABASE_URL}/restaurants/${restaurant.id}`;
  const li = document.createElement("li");
  const image = document.createElement("img");
  image.className = "restaurant-img";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + " restaurant";
  li.append(image);
  const name = document.createElement("h2");
  name.innerHTML = restaurant.name;
  li.append(name);
  const neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);
  const address = document.createElement("p");
  address.innerHTML = restaurant.address;
  li.append(address);
  const isFavourite = document.createElement("button");
  isFavourite.className = "isFavourite";
  isFavourite.id = `fav-${restaurant.id}`;
  isFavourite.onclick = changeOpt;
  if (restaurant.is_favorite === true) {
    isFavourite.innerHTML = "Unmark as Favorite";
  } else {
    isFavourite.innerHTML = "Mark as Favorite";
  }
  li.append(isFavourite);
  function changeOpt() {
    if (isFavourite.innerHTML === "Mark as Favorite") {
      isFavourite.innerHTML = "Unmark as Favorite";
      favour();
    } else {
      isFavourite.innerHTML = "Mark as Favorite";
      unfavour();
    }
  }
  function favour() {
    restaurant.is_favorite = true;
    fetch(url, {
      method: "PUT",
      body: JSON.stringify({ is_favorite: true }),
      headers: { "content-type": "application/json" }
    })
      .then(res => {
        res.json;

        DBHelper.dbPromise.then(function(db) {
          if (!db) return;
          let tx = db.transaction("reviewStore", "readwrite");
          let store = tx.objectStore("reviewStore");
          let updateRecord = store.get(restaurant.id);
          updateRecord.onsuccess = function() {
            let data = updateRecord.result;
            data.is_favorite = true;
            let updateFavor = store.put(data);
            updateFavor.onsuccess = function() {
              console.log("success uodating");
            };
          };
          updateRecord.onerror = function() {
            console.log("error updating");
          };
        });
      })
      .catch(err => console.log(err));
  }
  function unfavour() {
    restaurant.is_favorite = false;
    fetch(url, {
      method: "PUT",
      body: JSON.stringify({ is_favorite: false }),
      headers: { "content-type": "application/json" }
    })
      .then(res => {
        res.json;
        DBHelper.dbPromise.then(function(db) {
          if (!db) return;
          let tx = db.transaction("reviewStore", "readwrite");
          let store = tx.objectStore("reviewStore");
          let updateRecord = store.get(restaurant.id);
          updateRecord.onsuccess = function() {
            let data = updateRecord.result;
            data.is_favorite = false;
            let updateFavor = store.put(data);
            updateFavor.onsuccess = function() {
              console.log("success uodating");
            };
          };
          updateRecord.onerror = function() {
            console.log("error updating");
          };
        });
      })
      .catch(err => console.log(err));
  }
  const more = document.createElement("a");
  more.innerHTML = "View " + restaurant.name;
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);
  return li;
};
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, "click", () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
//a
