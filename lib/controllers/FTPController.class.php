<?php
namespace lib\controllers;

use \Exception;
use \InvalidArgumentException;

/**
 * FTPController permet de controller les volumes FTP.
 * @author $imon
 * @version 1.0
 */
class FTPController extends \lib\ServerCallComponent {
	protected $conn;
	
	protected function _getConnexion($data) {
		if (!empty($this->conn)) {
			return $this->conn;
		}
		
		if (!array_key_exists('host', $data) || empty($data['host'])) {
			throw new InvalidArgumentException('Veuillez sp&eacute;cifier l\'adresse du serveur FTP');
		}
		if (!array_key_exists('port', $data) || empty($data['port'])) {
			throw new InvalidArgumentException('Veuillez sp&eacute;cifier le port de connexion au serveur FTP');
		}
		if (!array_key_exists('user', $data) || empty($data['host'])) {
			throw new InvalidArgumentException('Veuillez sp&eacute;cifier le nom d\'utilisateur du serveur FTP');
		}
		if (!array_key_exists('password', $data) || empty($data['password'])) {
			throw new InvalidArgumentException('Veuillez sp&eacute;cifier le mot de passe du serveur FTP');
		}
		
		$conn = @ftp_connect($data['host'], $data['port']);
		
		if ($conn === false) {
			throw new Exception('Impossible de se connecter au serveur FTP "'.$loginData['host'].':'.$loginData['port'].'"');
		}
		
		if (@ftp_login($conn, $data['user'], $data['password'])) {
			$this->conn = $conn;
			return $conn;
		} else {
			throw new Exception('Impossible de se connecter au serveur FTP "'.$loginData['host'].':'.$loginData['port'].'" en tant que "'.$loginData['user'].'"');
		}
	}

	protected function connect($loginData) {
		$conn = $this->_getConnexion($loginData);
		
		ftp_close($conn);
	}
	
	protected function getMetadata($loginData, $file) {
		$dirname = preg_replace('#/[^/]*/?$#', '', $file);
		$basename = preg_replace('#^.*/#', '', $file);

		$list = $this->getFileList($loginData, $dirname);

		foreach ($list as $info) {
			if ($info['basename'] == $basename) {
				return $info;
			}
		}

		throw new Exception('Impossible de r&eacute;cup&eacute;rer les informations sur le fichier "'.$file.'"');
	}
	
	protected function getFile($loginData, $file) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		
		$result = @ftp_fget($conn, $tempHandle, $file, FTP_ASCII);
		
		if ($result !== false) { 
			rewind($tempHandle); 
			return array('contents' => stream_get_contents($tempHandle));
	    } else {
	    	throw new Exception('Impossible d\'acc&eacute;der au fichier "'.$file.'"');
	    }
	}

	protected function getFileAsBinary($loginData, $file) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		
		$result = @ftp_fget($conn, $tempHandle, $file, FTP_BINARY);
		
		if ($result !== false) { 
			rewind($tempHandle); 
			return array('contents' => base64_encode(stream_get_contents($tempHandle))); 
	    } else {
	    	throw new Exception('Impossible d\'acc&eacute;der au fichier "'.$file.'"');
	    }
	}
	
	protected function putFile($loginData, $file, $contents) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		fwrite($tempHandle, $contents);
		rewind($tempHandle);
		
		$result = @ftp_fput($conn, $file, $tempHandle, FTP_ASCII);
		
		if ($result === false) { 
	    	throw new Exception('Impossible d\'&eacute;crire dans le fichier "'.$file.'"');
	    }

	    return $this->getMetadata($loginData, $file);
	}

	protected function putFileAsBinary($loginData, $file, $contents) {
		$conn = $this->_getConnexion($loginData);
		
		$tempHandle = fopen('php://temp', 'r+');
		fwrite($tempHandle, base64_decode($contents));
		rewind($tempHandle);
		
		$result = @ftp_fput($conn, $file, $tempHandle,  FTP_BINARY);
		
		if ($result === false) { 
	    	throw new Exception('Impossible d\'&eacute;crire dans le fichier "'.$file.'"');
	    }

	    return $this->getMetadata($loginData, $file);
	}
	
	protected function getFileList($loginData, $dir) {
		$conn = $this->_getConnexion($loginData);
		
		$raw = ftp_rawlist($conn, $dir);

		if (!is_array($raw)) {
			var_dump($raw);
			var_dump($dir);
		}

		if ($raw === false) {
			//return array();
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
	
	protected function createFile($loginData, $file) {
		$this->putFile($loginData, $file, '');
		
		return $this->getMetadata($loginData, $file);
	}
	
	protected function createFolder($loginData, $dir) {
		$conn = $this->_getConnexion($loginData);
		
		$result = @ftp_mkdir($conn, $dir);
		
		if ($result === false) {
			throw new Exception('Impossible de cr&eacute;er le dossier "'.$dir.'"');
		}
		
		return $this->getMetadata($loginData, $dir);
	}
	
	protected function rename($loginData, $file, $newName) {
		$dirname = preg_replace('#/[^/]*/?$#', '', $file);
		
		$conn = $this->_getConnexion($loginData);
		
		$result = @ftp_rename($conn, $file, $dirname . '/' . $newName);
		
		if ($result === false) {
			throw new Exception('Impossible de renommer le fichier "'.$file.'"');
		}

		return $this->getMetadata($loginData, $file);
	}
	
	protected function delete($loginData, $file) {
		$data = $this->getMetadata($loginData, $file);
		
		if ($data['is_dir']) {
			$list = $this->getFileList($loginData, $file);
			foreach($list as $info) {
				if ($info['basename'] == '.' || $info['basename'] == '..') {
					continue;
				}
				
				$this->delete($loginData, $info['path']);
			}
			
			$conn = $this->_getConnexion($loginData);
			
			$result = @ftp_rmdir($conn, $file);
		} else {
			$conn = $this->_getConnexion($loginData);
			
			$result = @ftp_delete($conn, $file);
		}
		
		if ($result === false) {
			throw new Exception('Impossible de supprimer le fichier "'.$file.'"');
		}
	}
}