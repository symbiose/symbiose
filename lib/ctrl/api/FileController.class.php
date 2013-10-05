<?php
namespace lib\ctrl\api;

use \ZipArchive;

/**
 * Manage files.
 * @author $imon
 */
class FileController extends \lib\ApiBackController {
	const UPLOADS_CONFIG = '/etc/uploads.json';

	/**
	 * Get a file's content.
	 * @param  string $path The file path.
	 * @return string       The file's content.
	 */
	public function executeGetContents($path) {
		$manager = $this->managers()->getManagerOf('file');

		if ($manager->isDir($path)) {
			$files = $manager->readDir($path);

			$list = array();
			foreach($files as $filepath) {
				$list[$filepath] = $this->executeGetData($filepath);
			}

			return $list;
		} else {
			$this->responseContent->setChannel(1, $manager->read($path));
		}
	}

	/**
	 * Get a file's content, base64-encoded.
	 * @param  string $path The file path.
	 * @return string       The file's content, base64-encoded.
	 */
	public function executeGetAsBinary($path) {
		$manager = $this->managers()->getManagerOf('file');

		$this->responseContent->setChannel(1, base64_encode($manager->read($path)));
	}

	/**
	 * Get a file's metadata.
	 * @param  string $path The file's path.
	 * @return array        The file's metadata.
	 */
	public function executeGetData($path) {
		$manager = $this->managers()->getManagerOf('file');

		$data = array(
			'basename' => $manager->basename($path),
			'path' => $path,
			'realpath' => $manager->toInternalPath($path),
			'dirname' => $manager->dirname($path),
			'atime' => $manager->atime($path),
			'mtime' => $manager->mtime($path),
			'size' => $manager->size($path),
			'is_dir' => $manager->isDir($path),
			'mime_type' => $manager->mimetype($path)
		);

		if (!$data['is_dir']) {
			$data['extension'] = $manager->extension($path);
		}

		return $data;
	}

	/**
	 * Rename a file.
	 * @param string $oldpath The old file's path.
	 * @param string $newName The file's new path.
	 */
	public function executeRename($path, $newName) {
		$manager = $this->managers()->getManagerOf('file');

		if (strstr($newName, '/') !== false) { //Invalid file name
			throw new \InvalidArgumentException('Cannot rename file "'.$path.'" to "'.$newName.'" (invalid new file name)');
		}

		$parentDirPath = $manager->dirname($path);
		$newFilePath = $parentDirPath . '/' . $newName;

		if ($manager->exists($newFilePath)) { //File name already used
			throw new \RuntimeException('Cannot rename file "'.$path.'" to "'.$newName.'" (file name already used)');
		}

		//Let's move the file
		$manager->move($path, $newFilePath);

		//Return new data
		return $this->executeGetData($newFilePath);
	}

	/**
	 * Copy a file.
	 * @param string $source The source file.
	 * @param string $dest The destination directory or the destination path.
	 */
	public function executeCopy($source, $dest) {
		$manager = $this->managers()->getManagerOf('file');

		$copiedPath = $manager->copy($source, $dest, true);

		return $this->executeGetData($copiedPath);
	}

	/**
	 * Move a file.
	 * @param string $source The source file.
	 * @param string $dest The destination directory or the destination path.
	 */
	public function executeMove($source, $dest) {
		$manager = $this->managers()->getManagerOf('file');

		$copiedPath = $manager->move($source, $dest);

		return $this->executeGetData($copiedPath);
	}

	/**
	 * Delete a file.
	 * @param string $path The file to delete.
	 */
	public function executeDelete($path) {
		$manager = $this->managers()->getManagerOf('file');

		$manager->delete($path, true);
	}

	/**
	 * Create a file.
	 * @param string $path The new file path.
	 */
	public function executeCreateFile($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->createFile($path, true);
		} elseif ($manager->isDir($path)) {
			throw new \RuntimeException('Cannot create file "'.$path.'" (it is a directory)');
		}

		return $this->executeGetData($path);
	}

	/**
	 * Create a directory.
	 * @param string $path The new directory path.
	 */
	public function executeCreateFolder($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->mkdir($path, true);
		} elseif (!$manager->isDir($path)) {
			throw new \RuntimeException('Cannot create directory "'.$path.'" (it is a file)');
		}

		return $this->executeGetData($path);
	}

	/**
	 * Set a file's content.
	 * @param string $path The file's path.
	 * @param string $contents The new file's content.
	 */
	public function executeSetContents($path, $contents) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			$manager->createFile($path, true);
		}

		$manager->write($path, $contents);

		return $this->executeGetData($path);
	}

	/**
	 * Set a file's content, base64-encoded.
	 * @param string $path The file's path.
	 * @param string $contents The new file's content, base64-encoded.
	 */
	public function executeSetContentsAsBinary($path, $contents) {
		$contents = base64_decode($contents);

		return $this->executeSetContents($path, $contents);
	}

	/**
	 * Upload a file.
	 * @param string $dest The file's destination.
	 * @return array An array containing the upload's result : "success" is set to false if an error occurs, in that case "message" contains the error message.
	 */
	public function executeUpload($dest) {
		$manager = $this->managers()->getManagerOf('file');
		$configManager = $this->managers()->getManagerOf('config');

		//Load config
		$config = $configManager->open(self::UPLOADS_CONFIG)->read();

		//Uploads disabled
		if (!$config['enabled']) {
			return array('success' => false, 'msg' => 'File uploading is disabled');
		}

		//Destination dir doesn't exist
		if (!$manager->exists($dest) || !$manager->isDir($dest)) {
			return array('success' => false, 'msg' => 'Destination directory doesn\'t exist');
		}

		if ($this->app()->httpRequest()->getExists('file')) {
			$tmpFile = $manager->toInternalPath($manager->tmpfile());

			$inputStream = fopen('php://input', 'r');
			$tempStream = fopen($tmpFile, 'w');
			$realSize = stream_copy_to_stream($inputStream, $tempStream);
			fclose($inputStream);

			$_FILES['file'] = array(
				'error' => 0,
				'name' => $this->app()->httpRequest()->getData('file'),
				'size' => $realSize,
				'tmp_name' => $tmpFile
			);
		}

		//File not sent
		if (!isset($_FILES['file'])) {
			return array('success' => false, 'msg' => 'No file provided');
		}

		//An error has occured
		if ($_FILES['file']['error'] > 0) {
			switch($_FILES['file']['error']) {
				case UPLOAD_ERR_NO_FILE:
					$msg = 'No file provided';
					break;
				case UPLOAD_ERR_INI_SIZE:
				case UPLOAD_ERR_FORM_SIZE:
					$msg = 'File is too large';
					break;
				case UPLOAD_ERR_PARTIAL:
					$msg = 'Upload was interrupted';
					break;
				default:
					$msg = 'Error while uploading the file';
			}
			return array('success' => false, 'msg' => $msg);
		}

		//Max. file size
		if ($config['maxFileSize'] >= 0 && $_FILES['file']['size'] > $config['maxFileSize']) {
			return array('success' => false, 'msg' => 'File is too large');
		}

		//Check available space
		try {
			$manager->checkAvailableSpace($dest, $_FILES['file']['size']);
		} catch (\Exception $e) {
			return array('success' => false, 'msg' => $e->getMessage());
		}

		//File extension not allowed
		$extension = strtolower(substr(strrchr($_FILES['file']['name'], '.'), 1));
		if (!in_array('*', $config['allowedExtensions']) && !in_array($extension, $config['allowedExtensions'])) {
			return array('success' => false, 'msg' => 'File extension "'.$extension.'" is not allowed');
		}

		//Change the file name if it already exists
		$path = $dest.'/'.$_FILES['file']['name'];
		$filename = preg_replace('#\.'.$extension.'$#', '', $_FILES['file']['name']);
		$i = 2;

		while($manager->exists($path)) { //Choose another file name
			$path = $dest.'/'.$filename.'-'.$i.'.'.$extension;
			$i++;
		}

		//Copy
		$internalPath = $manager->toInternalPath($path);
		$result = copy($_FILES['file']['tmp_name'], $internalPath);

		if (!$result) { //Error while copying
			return array('success' => false, 'msg' => 'Error while copying uploaded file');
		}

		//Chmod the file to 0777
		chmod($internalPath, 0777);

		//Return uploaded file's metadata
		return array('success' => true, 'file' => $this->executeGetData($path));
	}

	/**
	 * Download a file.
	 * @param string $path The file to download.
	 * @todo Move that method to RawDataCall.
	 */
	public function executeDownload($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->exists($path)) {
			throw new \RuntimeException('');
		}

		if ($manager->isDir($path)) {
			$filesInDir = $manager->readDir($path, true); //Read recursively the directory
			$tmpFilePath = $manager->tmpfile();
			$zip = new ZipArchive();
			$zip->open($manager->toInternalPath($tmpFilePath), ZipArchive::CREATE);

			foreach($filesInDir as $filename => $filepath) {
				if ($manager->isDir($filepath)) {
					$added = $zip->addEmptyDir($filename);
				} else {
					$added = $zip->addFile($manager->toInternalPath($filepath), $filename);
				}

				if ($added === false) {
					throw new \RuntimeException('Unable to add "'.$filepath.'" to zip file');
				}
			}

			$zip->close();

			$source = $tmpFilePath;
			$filename = $manager->basename($path) . '.zip';
		} else {
			$source = $path;
			$filename = $manager->basename($path);
		}

		$httpResponse = $this->app->httpResponse();
		$httpResponse->addHeader('Content-Description: File Transfer');
		$httpResponse->addHeader('Content-Type: application/octet-stream');
		$httpResponse->addHeader('Content-Disposition: attachment; filename="' . $filename . '"');
		$httpResponse->addHeader('Content-Transfer-Encoding: binary');
		$httpResponse->addHeader('Expires: 0');
		$httpResponse->addHeader('Cache-Control: must-revalidate, post-check=0, pre-check=0');
		$httpResponse->addHeader('Pragma: public');
		$httpResponse->addHeader('Content-Length: ' . $manager->size($source));
		readfile($manager->toInternalPath($source));
		exit;
	}
}