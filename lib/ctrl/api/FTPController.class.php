<?php
namespace lib\ctrl\api;

use \InvalidArgumentException;

/**
 * Manage FTP connections.
 * @author $imon
 */
class FTPController extends \lib\ApiBackController {
	protected $conn;
	
	protected function _getConnexion($data) {
		if (!empty($this->conn)) {
			return $this->conn;
		}

		if (!array_key_exists('host', $data) || empty($data['host'])) {
			throw new InvalidArgumentException('Empty FTP server adress');
		}
		if (!array_key_exists('port', $data) || empty($data['port'])) {
			throw new InvalidArgumentException('Empty FTP server port');
		}
		if (!array_key_exists('user', $data) || empty($data['host'])) {
			throw new InvalidArgumentException('Empty FTP server user');
		}
		if (!array_key_exists('password', $data) || empty($data['password'])) {
			throw new InvalidArgumentException('Empty FTP server password');
		}

		$conn = ftp_connect($data['host'], $data['port']);

		if ($conn === false) {
			throw new \RuntimeException('Cannot connect to FTP server "'.$loginData['host'].':'.$loginData['port'].'"');
		}

		if (ftp_login($conn, $data['user'], $data['password'])) {
			$this->conn = $conn;
			return $conn;
		} else {
			throw new \RuntimeException('Cannot connect to FTP server "'.$loginData['host'].':'.$loginData['port'].'" with username "'.$loginData['user'].'" (authentification failed)');
		}
	}

	public function executeConnect($loginData) {
		$conn = $this->_getConnexion($loginData);

		ftp_close($conn);
	}
	
	public function executeGetMetadata($loginData, $file) {
		$dirname = preg_replace('#/[^/]*/?$#', '', $file);
		$basename = preg_replace('#^.*/#', '', $file);

		$list = $this->executeGetFileList($loginData, $dirname);

		foreach ($list as $info) {
			if ($info['basename'] == $basename) {
				return $info;
			}
		}

		throw new \RuntimeException('Cannot retrieve metadata about the file "'.$file.'"');
	}
	
	public function executeGetFile($loginData, $file) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		
		$result = ftp_fget($conn, $tempHandle, $file, FTP_ASCII);
		
		if ($result !== false) { 
			rewind($tempHandle); 
			return array('contents' => stream_get_contents($tempHandle));
	    } else {
	    	throw new \RuntimeException('Cannot open file "'.$file.'"');
	    }
	}

	public function executeGetFileAsBinary($loginData, $file) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		
		$result = ftp_fget($conn, $tempHandle, $file, FTP_BINARY);
		
		if ($result !== false) { 
			rewind($tempHandle); 
			return array('contents' => base64_encode(stream_get_contents($tempHandle))); 
	    } else {
	    	throw new \RuntimeException('Cannot open file "'.$file.'"');
	    }
	}
	
	public function executePutFile($loginData, $file, $contents) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		fwrite($tempHandle, $contents);
		rewind($tempHandle);
		
		$result = ftp_fput($conn, $file, $tempHandle, FTP_ASCII);
		
		if ($result === false) { 
	    	throw new \RuntimeException('Cannot write in file "'.$file.'"');
	    }

	    return $this->executeGetMetadata($loginData, $file);
	}

	public function executePutFileAsBinary($loginData, $file, $contents) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		fwrite($tempHandle, base64_decode($contents));
		rewind($tempHandle);
		
		$result = ftp_fput($conn, $file, $tempHandle,  FTP_BINARY);
		
		if ($result === false) { 
	    	throw new \RuntimeException('Cannot write in file "'.$file.'"');
	    }

	    return $this->executeGetMetadata($loginData, $file);
	}
	
	public function executeGetFileList($loginData, $dir) {
		$conn = $this->_getConnexion($loginData);
		
		$raw = ftp_rawlist($conn, $dir);

		if ($raw === false) {
			throw new \RuntimeException('Cannot read directory "'.$dir.'"');
		}
		
		$list = array();
		
		foreach($raw as $rawfile) {
			$info = preg_split("/[\s]+/", $rawfile, 9);
			$data = array(
				'path'   => $dir . '/' . $info[8],
				'basename' => $info[8],
				'is_dir' => ($info[0]{0} == 'd'),
				'readable' => ($info[0]{1} == 'r'),
				'writable' => ($info[0]{2} == 'w'),
				'size'   => (int) $info[4],
				'mtime'  => strtotime($info[6] . ' ' . $info[5] . ' ' . ((strpos($info[7], ':') === false) ? $info[7] : date('Y') . ' ' . $info[7]) ),
				'raw'    => $info
			);

			if ($data['basename'] == '.' || $data['basename'] == '..')
				continue;

			$list[] = $data;
		}
		
		return $list;
	}
	
	public function executeCreateFile($loginData, $file) {
		$this->executePutFile($loginData, $file, '');
		
		return $this->executeGetMetadata($loginData, $file);
	}
	
	public function executeCreateFolder($loginData, $dir) {
		$conn = $this->_getConnexion($loginData);
		
		$result = ftp_mkdir($conn, $dir);
		
		if ($result === false) {
			throw new \RuntimeException('Cannot create directory "'.$dir.'"');
		}
		
		return $this->executeGetMetadata($loginData, $dir);
	}
	
	public function executeRename($loginData, $file, $newName) {
		$dirname = preg_replace('#/[^/]*/?$#', '', $file);
		
		$conn = $this->_getConnexion($loginData);
		
		$result = ftp_rename($conn, $file, $dirname . '/' . $newName);
		
		if ($result === false) {
			throw new \RuntimeException('Cannot rename file "'.$file.'"');
		}

		return $this->executeGetMetadata($loginData, $file);
	}
	
	public function executeDelete($loginData, $file) {
		$data = $this->executeGetMetadata($loginData, $file);
		
		if ($data['is_dir']) {
			$list = $this->executeGetFileList($loginData, $file);
			foreach($list as $info) {
				if ($info['basename'] == '.' || $info['basename'] == '..') {
					continue;
				}
				
				$this->executeDelete($loginData, $info['path']);
			}
			
			$conn = $this->_getConnexion($loginData);
			
			$result = ftp_rmdir($conn, $file);
		} else {
			$conn = $this->_getConnexion($loginData);
			
			$result = ftp_delete($conn, $file);
		}
		
		if ($result === false) {
			throw new \RuntimeException('Cannot delete file "'.$file.'"');
		}
	}
}