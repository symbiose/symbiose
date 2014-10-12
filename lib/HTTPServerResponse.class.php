<?php
namespace lib;

use Ratchet\ConnectionInterface;
use Guzzle\Http\Message\Response;

/**
 * The HTTP server response.
 * @since 1.0beta5
 */
class HTTPServerResponse extends HTTPResponse {
	protected $headersSent = false;
	protected $headers = array();

	public function __construct(ConnectionInterface $conn) {
		$this->conn = $conn;
	}

	public function addHeader($header) {
		// Ugly fix on Heroku
		if (strtolower(substr($header, 0, strlen('content-length'))) == 'content-length' && 
			getenv('DYNO') !== false && getenv('BUILDPACK_URL') !== false) {
			return;
		}

		$this->headers[] = $header;
	}

	public function removeHeader($headerToRemove) {
		foreach ($this->headers as $i => $header) {
			if ($headerToRemove == $header) {
				unset($this->headers[$i]);
				break;
			}
		}
	}

	public function listHeaders() {
		return $this->headers;
	}

	public function getHeader($name) {
		foreach ($this->headers as $i => $header) {
			$begining = substr($header, 0, strlen($name) + 1);
			if (strtolower($begining) == strtolower($name).':') {
				return trim(substr($header, strlen($name) + 1));
			}
		}
	}

	public function responseCode() {
		foreach ($this->headers as $header) {
			if (preg_match('#^HTTP/[0-9.]+ ([0-9]{3}) ([a-zA-Z ]+)$#', $header, $matches)) {
				return (int) $matches[1];
			}
		}
		return 200;
	}

	protected function getRaw($output = '') {
		$status = $this->responseCode();
		$headers = array();
		foreach ($this->headers as $header) {
			$parts = explode(':', $header, 2);
			if (count($parts) == 2) {
				$headers[$parts[0]] = $parts[1];
			}
		}

		return new Response($status, $headers, $output);
	}

	public function getOutput() {
		return $this->getRaw($this->content->generate());
	}

	public function send() {
		$out = $this->content->generate();

		$contentLength = $this->getHeader('Content-Length');
		if (empty($contentLength)) {
			$this->addHeader('Content-Length: ' . strlen($out));
		}

		$this->output($out);

		if ($this->getHeader('Connection') != 'keep-alive') {
			$this->conn->close();
		}
	}

	public function headersSent() {
		return $this->headersSent;
	}

	public function output($out) {
		if (!$this->headersSent) {
			$this->headersSent = true;

			$this->conn->send((string)$this->getRaw());
		}

		$this->length += strlen($out);
		
		$this->conn->send($out);
	}
}