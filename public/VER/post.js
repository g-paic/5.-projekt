import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

let player = document.getElementById("player");
let beforeSnap = document.getElementById("beforeSnap");
let afterSnap = document.getElementById("afterSnap");
let snapName = document.getElementById("snapName");

let startCapture = function() {
    beforeSnap.classList.remove("d-none");
    beforeSnap.classList.add("d-flex", "flex-column", "align-items-center");
    afterSnap.classList.remove("d-flex", "flex-column", "align-items-center");
    afterSnap.classList.add("d-none");
    
    if(!("mediaDevices" in navigator)) {
        // fallback to file upload button, ili sl.
        // vidjet i custom API-je: webkitGetUserMedia i mozGetUserMedia
    } else {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then((stream) => {
                player.srcObject = stream;
            })
            .catch((err) => {
                alert("Media stream not working");
                console.log(err);
            });
    }
};

startCapture();

let stopCapture = function () {
    afterSnap.classList.remove("d-none");
    afterSnap.classList.add("d-flex", "flex-column", "align-items-center");
    beforeSnap.classList.remove("d-flex", "flex-column", "align-items-center");
    beforeSnap.classList.add("d-none");
};

var theStream;
var theRecorder;
var recorder;
var recordedChunks = [];
var url;

let videoCapture = function() {
    navigator.mediaDevices
        .getUserMedia({video: true, audio: true})
        .then(function(stream) {
            var mediaControl = document.querySelector('video');
            
            if('srcObject' in mediaControl) {
                mediaControl.srcObject = stream;
            } else if(navigator.mozGetUserMedia) {
                mediaControl.mozSrcObject = stream;
            } else {
                mediaControl.src = (window.URL || window.webkitURL).createObjectURL(stream);
            }
            
            theStream = stream;
            
            try {
                recorder = new MediaRecorder(stream, {mimeType : "video/webm"});
            } catch(e) {
                console.error('Exception while creating MediaRecorder: ' + e);
                return;
            }
            
            theRecorder = recorder;
            console.log('MediaRecorder created');
            recorder.ondataavailable = recorderOnDataAvailable;
            recorder.start(100);
        })
}

function recorderOnDataAvailable(event) {
    if(event.data.size == 0) return;
    recordedChunks.push(event.data);
}

function download() {
    console.log('Saving data');

    theRecorder.stop();
    theStream.getTracks()[0].stop();
    
    var blob = new Blob(recordedChunks, {type: "video/webm"});
    url = (window.URL || window.webkitURL).createObjectURL(blob);

    stopCapture();
}

document.getElementById("btnRecord").addEventListener("click", function(event) {
    addSnap();
    videoCapture();
});

function addSnap() {
    document.getElementById("btnRecord").remove();
    document.getElementById("r").innerHTML = "The video is being recorded";

    let b = document.createElement("button");
    b.className = "btn btn-primary mt-2";
    b.id = "btnSnap";

    let i = document.createElement("i");
    i.className = "bi bi-camera";

    let s = document.createElement("span");
    s.innerHTML = " Snap"

    beforeSnap.appendChild(b);
    b.appendChild(i);
    b.appendChild(s);

    b.addEventListener("click", function(event) {
        download();
    });
}

function addRecord() {
    document.getElementById("btnSnap").remove();

    let p = document.getElementById("r");
    p.innerHTML = "";

    let b = document.createElement("button");
    b.className = "btn btn-primary mt-2";
    b.id = "btnRecord";

    let i = document.createElement("i");
    i.className = "bi bi-camera";

    let s = document.createElement("span");
    s.innerHTML = " Record";

    beforeSnap.insertBefore(b, p);
    b.appendChild(i);
    b.appendChild(s);

    b.addEventListener("click", function(event) {
        addSnap();
        videoCapture();
    });
}

document.getElementById("btnUpload").addEventListener("click", function(event) {
    event.preventDefault();

    if(!snapName.value.trim()) {
        alert("The video needs a name");
        return false;
    }

    if("serviceWorker" in navigator && "SyncManager" in window) {
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => {
                let ts = new Date().toISOString();
                let id = ts + snapName.value.replace(/\s/g, "_"); // ws->_

                set(id, {
                    id,
                    ts,
                    title: snapName.value,
                    video: blob
                });
                
                return navigator.serviceWorker.ready;
            })
            .then((swRegistration) => {
                return swRegistration.sync.register("sync-snaps");
            })
            .then(() => {
                console.log("Queued for sync");
                startCapture();
            })
            .catch((error) => {
                alert(error);
                console.log(error);
            });
    } else {
        alert("TODO - vaš preglednik ne podržava bckg sync...");
    }
        
    addRecord();
});