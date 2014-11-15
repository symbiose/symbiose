<?php

namespace Wrappers;

/**
 * A SFTP stream wrapper.
 * @see http://php.net/manual/en/class.streamwrapper.php
 * @author emersion <contact@emersion.fr>
 */
class SftpStream extends Stream /*implements WrapperInterface*/ {
	protected static $protocol = 'sftp';
	protected static $defaultPort = 22;

	protected $conn;
	protected $sftp;

	protected $stream_handle;
	protected $stream_pos;

	protected $dir_handle;

	protected static function conn_supported() {
		return extension_loaded('ssh2');
	}

	protected static function conn_new($urlData) {
		if (!static::conn_supported()) {
			return false;
		}

		$conn = ssh2_connect($urlData['host'], $urlData['port']);
		if ($conn === false) {
			return false;
		}

		if (!empty($urlData['user'])) {
			if (!ssh2_auth_password($conn, $urlData['user'], $urlData['pass'])) {
				return false;
			}
		}

		return $conn;
	}

	protected static function conn_close($conn) {
		if (ssh2_exec($conn, 'exit') === false) {
			return false;
		}
		return true;
	}

	protected function conn_open($url) {
		$oldconn = $this->conn;

		if (!parent::conn_open($url)) {
			return false;
		}

		if ($this->conn !== $oldconn) {
			// Start SFTP subsystem on the new connection
			if (($this->sftp = ssh2_sftp($this->conn)) === false) {
				return false;
			}
		}
		return true;
	}

	protected function conn_url($oldUrl = null) {
		$path = parse_url((!empty($oldUrl)) ? $oldUrl : $this->url, PHP_URL_PATH);
		$url = 'ssh2.sftp://'.$this->sftp.'/'.$path;
		if ($path == '/') { // See http://php.net/manual/en/wrappers.ssh2.php#112128
			$url .= '.';
		}
		return $url;
	}

	public function url_stat($url, $flags) {
		if (!$this->conn_open($url)) {
			return false;
		}

		return @stat($this->conn_url());
	}

	// STREAM

	public function stream_open($url, $mode, $options, &$opened_path) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$this->stream_handle = fopen($this->conn_url(), $mode);
		$this->stream_pos = 0;

		return true;
	}

	public function stream_read($count) {
		$buffer = stream_get_contents($this->stream_handle, $count);
		$this->stream_pos += strlen($buffer);
		return $buffer;
	}

	public function stream_write($data) {
		return fwrite($this->stream_handle, $data);
	}

	public function stream_eof() {
		return feof($this->stream_handle);
	}

	public function stream_stat() {
		return fstat($this->stream_handle);
	}

	public function stream_flush() {
		return fflush($this->stream_handle);
	}

	public function stream_seek($offset, $whence = SEEK_SET) {
		if (fseek($this->stream_handle, $offset, $whence) === 0) {
			$this->stream_pos = $offset;
			return true;
		}
		return false;
	}

	public function stream_tell() {
		return $this->stream_pos;
	}

	public function stream_set_option($option, $arg1, $arg2) {
		return false; // TODO: not implemented
	}

	public function stream_truncate($new_size) {
		return ftruncate($this->stream_handle, $new_size);
	}

	public function stream_close() {
		fclose($this->stream_handle);
		$this->stream_handle = null;
	}

	public function stream_metadata($url, $option, $value) {
		if (!$this->conn_open($url)) {
			return false;
		}

		switch ($option) {
			case STREAM_META_TOUCH:
				return touch($this->conn_url(), $value[0], $value[1]);
			case STREAM_META_OWNER_NAME:
			case STREAM_META_OWNER:
				return chown($this->conn_url(), $value);
			case STREAM_META_GROUP_NAME:
			case STREAM_META_GROUP:
				return chgrp($this->conn_url(), $value);
			case STREAM_META_ACCESS:
				return chmod($this->conn_url(), $value);
		}
	}

	// DIR
	
	public function dir_opendir($url, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		if (($this->dir_handle = opendir($this->conn_url())) === false) {
			return false;
		}
		return true;
	}

	public function dir_readdir() {
		return readdir($this->dir_handle);
	}

	public function dir_rewinddir() {
		rewinddir($this->dir_handle);
		return true;
	}

	public function dir_closedir() {
		closedir($this->dir_handle);
		return true;
	}

	// FS

	public function mkdir($url, $mode, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$recursive = ($options & STREAM_MKDIR_RECURSIVE);
		return mkdir($this->conn_url(), $mode, $recursive);
	}

	public function rename($url_from, $url_to) {
		if (!$this->conn_open($url_from)) {
			return false;
		}

		$oldname = $this->conn_url($url_from);
		$newname = $this->conn_url($url_to);
		return rename($oldname, $newname);
	}

	public function unlink($url) {
		if (!$this->conn_open($url)) {
			return false;
		}

		return unlink($this->conn_url());
	}

	public function rmdir($url, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		return rmdir($this->conn_url());
	}
}