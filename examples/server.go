package main

// Imports
import (
    "fmt"
    "io/ioutil"
    "net/http"
    "flag"
    "encoding/json"
)

// JSON response mapping
type Response map[string]interface{}

// Represents an file loaded
type Page struct {
	Title string
	Body []byte
}

// Converts the JSON to strings
// to be sent as a response
func (r Response) String() (s string) {
    b, err := json.Marshal(r)
    if err != nil {
            s = ""
            return
    }
    s = string(b)
    return
}

// Opens a file and returns it represented
// as a Page.
func loadPage(folder, title string) (*Page, error) {
    filename := folder + "/" + title
    body, err := ioutil.ReadFile(filename)
    if err != nil {
        return nil, err
    }
    return &Page{Title: title, Body: body}, nil
}

// Creates a function that will be used as a handler
// for static and template responses. See Usage!
func fileResponseCreator(folder string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
        fmt.Println("GET\t" + r.URL.Path)
    	var p *Page
    	var err error
    	if len(r.URL.Path) == 1 {
            // In case the path is just '/'
    		p, err = loadPage("templates", "index.html")
    	} else {
    		p, err = loadPage(folder, r.URL.Path[1:])
    	}
    	if p != nil {
    		w.Write(p.Body)
    	} else {
    		fmt.Println("ERROR\t" + err.Error())
    	}
	}
}

// Handles all Javascript, images, and HTML
// file requests
func displayHandler() {
    http.HandleFunc("/", fileResponseCreator("."))
    http.HandleFunc("/cascades/", fileResponseCreator(".."))
    http.HandleFunc("/js/", fileResponseCreator(".."))
}

func main() {
    displayHandler()
    var addr_flag = flag.String("addr", "localhost", "Address the http server binds to")
    var port_flag = flag.String("port", "8080", "Port used for http server")
    flag.Parse()
    //fmt.Println("Running server on " + *addr_flag + ":" + *port_flag)
    err := http.ListenAndServe(*addr_flag + ":" + *port_flag, nil)
    fmt.Println(err)
}

