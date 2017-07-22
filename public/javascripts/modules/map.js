import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
    center: {lat: 43.2, lng: -79.8},
    zoom: 8
};

function loadPlace(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            console.log(places);
            if(!places.length){
                alert('no places near you');
                return;
            }
            //create a bounds
            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates;
                const position = { lat: placeLat, lng: placeLng};
                bounds.extend(position);
                const marker = new google.maps.Marker( { map, position } );
                marker.place = place;
                return marker;
            });

            markers.forEach(marker => marker.addListener('click', function () {
                const html = ` <div class="popup">
                                    <a href="/store/${this.place.slug}">
                                        <img src="/uploads/${this.place.photo || 'store.png'}" alt=${this.place.name} />
                                        <p>${this.place.name} - ${this.place.location.address}</p>
                                    </a>"
                               </div>`;
                infoWindow.setContent(html);
                infoWindow.open(map, this);
                console.log(this.place);
            }));

            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        })
}

function makeMap(mapDiv){
    if(!mapDiv) return;
    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlace(map);
    const input = $('[name="geolocate"]');
    const autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        loadPlace(map, place.geometry.location.lat(), place.geometry.location.lng());
    })
    console.log(mapDiv);
}

export default makeMap;