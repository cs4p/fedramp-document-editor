import webview
import os
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

def start_server(port, base_dir):
    os.chdir(base_dir)
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    httpd.serve_forever()

def main():
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    dist_dir = os.path.join(base_dir, 'dist')
    if not os.path.exists(dist_dir):
        print("Error: dist/ not found. Run 'bun run build' first.")
        sys.exit(1)

    index_path = os.path.join(dist_dir, 'index.html')
    if not os.path.exists(index_path):
        print(f"Error: {index_path} not found.")
        sys.exit(1)

    port = 8080

    server_thread = threading.Thread(target=start_server, args=(port, dist_dir), daemon=True)
    server_thread.start()

    window = webview.create_window(
        'FedRAMP 20x Assessment Desktop App',
        f'http://localhost:{port}/index.html',
        width=1024,
        height=800,
        resizable=True,
        min_size=(800, 600)
    )

    webview.start()

if __name__ == '__main__':
    main()
