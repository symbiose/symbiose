<?php

namespace Wrappers;

/**
 * A FTP stream wrapper.
 * @see http://php.net/manual/en/class.streamwrapper.php
 * @author emersion <contact@emersion.fr>
 */
class FtpStream extends Stream /*implements WrapperInterface*/ {
	protected static $protocol = 'ftp';
	protected static $defaultPort = 21;

	protected $conn;

	protected $url;

	protected $stream_mode;
	protected $stream_pos;
	protected $stream_handle;

	protected $dir_list;
	protected $dir_pos;

	protected static function conn_new($urlData) {
		$conn = ftp_connect($urlData['host'], $urlData['port']);
		if ($conn === false) {
			return false;
		}

		if (!empty($urlData['user'])) {
			if (!ftp_login($conn, $urlData['user'], $urlData['pass'])) {
				return false;
			}
		}

		// Turn passive mode on
		ftp_pasv($conn, true);

		return $conn;
	}

	protected static function conn_close($conn) {
		return ftp_close($conn);
	}

	/**
	 * Convert mode from drwxrwxrwx to 040777.
	 * @param  string $hrRights Human-readable mode.
	 * @return int              Octal mode.
	 */
	protected function mode_hr_to_octal($hrRights) {
		$octalRights = 0;
		if ($hrRights{0} == 'd') {
			$octalRights +=  40000;
		} else {
			$octalRights += 100000;
		}
		for ($i = 0; $i < strlen($hrRights) - 1; $i++) {
			$char = $hrRights{$i+1};
			$val = 0;
			switch ($char) {
				case 'r':
					$val = 4;
					break;
				case 'w':
					$val = 2;
					break;
				case 'x':
					$val = 1;
					break;
			}
			$octalRights += pow(10, (int)((8 - $i) / 3)) * $val;
		}

		return octdec((string)$octalRights);
	}

	public function url_stat($url, $flags) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$stat = false;

		$path = parse_url($url, PHP_URL_PATH);
		$dirname = dirname($path);
		$filename = basename($path);

		if ($path != $dirname) {
			$raw = ftp_rawlist($this->conn, $dirname);
			if ($raw === false) {
				return false;
			}

			$fileData = null;
			foreach ($raw as $rawfile) {
				$info = preg_split("/[\s]+/", $rawfile, 9);

				if ($info[8] == $filename) {
					$stat = array(
						'size' => (int) $info[4],
						'mtime' => strtotime($info[6] . ' ' . $info[5] . ' ' . ((strpos($info[7], ':') === false) ? $info[7] : date('Y') . ' ' . $info[7]) ),
						'mode' => $this->mode_hr_to_octal($info[0])
					);
					break;
				}
			}
		} else {
			$stat = array('mode' => $this->mode_hr_to_octal('drwxrwxrwx'));
		}

		return $stat;
	}

	// STREAM

	public function stream_open($url, $mode, $options, &$opened_path) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$this->stream_handle = fopen('php://memory','r+');
		$this->stream_pos = 0;
		$this->stream_written = false;
		$this->stream_mode = $mode;

		return true;
	}

	public function stream_read($count) {
		// TODO: use ftp_nb_fget() - http://php.net/manual/en/function.ftp-nb-fget.php
		if (!$this->stream_written) {
			$path = parse_url($this->url, PHP_URL_PATH);
			if (!ftp_fget($this->conn, $this->stream_handle, $path, FTP_BINARY, $this->stream_pos)) {
				return false;
			}
			rewind($this->stream_handle);
			$this->stream_written = true;
		}

		$buffer = stream_get_contents($this->stream_handle, $count);
		$this->stream_pos += strlen($buffer);
		return $buffer;
	}

	public function stream_write($data) {
		return fwrite($this->stream_handle, $data);
	}

	public function stream_flush() {
		$path = parse_url($this->url, PHP_URL_PATH);
		rewind($this->stream_handle);
		return ftp_fput($this->conn, $path, $this->stream_handle, FTP_BINARY, $this->stream_pos);
	}

	public function stream_eof() {
		return feof($this->stream_handle);
	}

	public function stream_seek($offset, $whence = SEEK_SET) {
		if (fseek($this->stream_handle, $offset, $whence) === 0) {
			$this->stream_pos = $offset;
			return true;
		}
		return false;
	}

	public function stream_stat() {
		return $this->url_stat($this->url);
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
				$stat = $this->url_stat($url, 0);
				if ($stat === false) { // Create the file if it doesn't exist
					$this->stream_open($url, 'w');
					$this->stream_write('');
					$this->stream_flush();
					$this->stream_close();
				}
				return true;
			case STREAM_META_OWNER_NAME:
			case STREAM_META_OWNER:
			case STREAM_META_GROUP_NAME:
			case STREAM_META_GROUP:
				return false; // Unsupported
			case STREAM_META_ACCESS:
				$path = parse_url($url, PHP_URL_PATH);
				return $this->chmod($path, $value);
		}
	}

	// DIR
	
	public function dir_opendir($url, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$this->dir_pos = 0;

		$path = parse_url($url, PHP_URL_PATH);
		if (($this->dir_list = ftp_nlist($this->conn, $path)) === false) {
			return false;
		}

		return true;
	}

	public function dir_readdir() {
		if (($filename = next($this->dir_list)) === false) {
			return false;
		}
		$this->dir_pos++;
		return basename($filename);
	}

	public function dir_rewinddir() {
		reset($this->dir_list);
		$this->dir_pos = 0;
		return true;
	}

	public function dir_closedir() {
		return true;
	}

	// FS
	
	protected function chmod($path, $mode) {
		// See http://php.net/manual/en/function.ftp-chmod.php#93684
		$mode = octdec(str_pad($mode, 4, '0', STR_PAD_LEFT));
		if (ftp_chmod($this->conn, $mode, $path) === false) {
			return false;
		}
		return true;
	}

	public function mkdir($url, $mode, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$path = parse_url($url, PHP_URL_PATH);
		if (ftp_mkdir($this->conn, $path) === false) {
			return false;
		}

		// Try to chmod new dir
		$this->chmod($path, $mode);

		return true;
	}

	public function rename($url_from, $url_to) {
		if (!$this->conn_open($url_from)) {
			return false;
		}

		$oldname = parse_url($url_from, PHP_URL_PATH);
		$newname = parse_url($url_to, PHP_URL_PATH);
		return ftp_rename($this->conn, $oldname, $newname);
	}

	public function unlink($url) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$path = parse_url($url, PHP_URL_PATH);
		return ftp_delete($this->conn, $path);
	}

	public function rmdir($url, $options) {
		if (!$this->conn_open($url)) {
			return false;
		}

		$path = parse_url($url, PHP_URL_PATH);
		return ftp_rmdir($this->conn, $path);
	}
}