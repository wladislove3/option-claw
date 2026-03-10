package websocket

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	gorillaws "github.com/gorilla/websocket"
)

func TestRegisterAndUnregisterPositionClient(t *testing.T) {
	positionClients = make(map[*positionsClient]struct{})

	client := &positionsClient{}
	registerPositionClient(client)

	if got := positionClientCount(); got != 1 {
		t.Fatalf("positionClientCount() = %d, want 1", got)
	}

	snapshot := snapshotPositionClients()
	if len(snapshot) != 1 || snapshot[0] != client {
		t.Fatalf("snapshotPositionClients() = %#v, want client in snapshot", snapshot)
	}

	unregisterPositionClient(client)
	unregisterPositionClient(client)

	if got := positionClientCount(); got != 0 {
		t.Fatalf("positionClientCount() after unregister = %d, want 0", got)
	}
}

func TestBroadcastPositionsRemovesBrokenClients(t *testing.T) {
	positionClients = make(map[*positionsClient]struct{})

	serverClient, peer := newTestPositionsClient(t)
	registerPositionClient(serverClient)
	peer.Close()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		BroadcastPositions()
		if positionClientCount() == 0 {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}

	t.Fatalf("broken client was not removed; count=%d", positionClientCount())
}

func TestPositionsClientWritePing(t *testing.T) {
	serverClient, peer := newTestPositionsClient(t)
	defer peer.Close()
	defer serverClient.conn.Close()

	pingReceived := make(chan struct{}, 1)
	peer.SetPingHandler(func(string) error {
		pingReceived <- struct{}{}
		return nil
	})

	readDone := make(chan struct{})
	go func() {
		defer close(readDone)
		for {
			if _, _, err := peer.ReadMessage(); err != nil {
				return
			}
		}
	}()

	if err := serverClient.writePing(); err != nil {
		t.Fatalf("writePing() error = %v", err)
	}

	select {
	case <-pingReceived:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for ping frame")
	}

	peer.Close()
	<-readDone
}

func newTestPositionsClient(t *testing.T) (*positionsClient, *gorillaws.Conn) {
	t.Helper()

	serverConnCh := make(chan *gorillaws.Conn, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("Upgrade() error = %v", err)
			return
		}
		serverConnCh <- conn
	}))
	t.Cleanup(server.Close)

	wsURL := "ws" + server.URL[len("http"):]
	peer, _, err := gorillaws.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Dial() error = %v", err)
	}

	select {
	case conn := <-serverConnCh:
		return &positionsClient{conn: conn}, peer
	case <-time.After(2 * time.Second):
		peer.Close()
		t.Fatal("timed out waiting for websocket upgrade")
		return nil, nil
	}
}
