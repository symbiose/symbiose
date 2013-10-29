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

		if (!$manager->exists($path)) {
			throw new \RuntimeException('"'.$path.'" : no such file or directory');
		}

		$data = array(
			'basename' => $manager->basename($path),
			'path' => $path,
			'realpath' => $manager->toInternalPath($path),
			'download_url' => $manager->toInternalPath($path) . '?dl=1',
			'dirname' => $manager->dirname($path),
			'atime' => $manager->atime($path),
			'mtime' => $manager->mtime($path),
			'size' => $manager->size($path),
			'is_dir' => $manager->isDir($path),
			'mime_type' => $manager->mimetype($path)
		);

		if ($data['is_dir']) {
			$data['available_space'] = $manager->availableSpace($path);
		} else {
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
		$shareManager = $this->managers()->getManagerOf('sharedFile');
		$user = $this->app()->user();

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

		if ($user->isLogged()) {
			$internalPath = $manager->toInternalPath($path);
			$share = $shareManager->getByPath($user->id(), $internalPath);

			if (!empty($share) && $internalPath == $share['path']) {
				$share->setPath($manager->toInternalPath($newFilePath));
				$shareManager->update($share);
			}
		}

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
		$shareManager = $this->managers()->getManagerOf('sharedFile');
		$user = $this->app()->user();

		$movedPath = $manager->move($source, $dest);

		if ($user->isLogged()) {
			$sourceInternalPath = $manager->toInternalPath($source);
			$share = $shareManager->getByPath($user->id(), $sourceInternalPath);

			if (!empty($share) && $sourceInternalPath == $share['path']) {
				$share->setPath($manager->toInternalPath($movedPath));
				$shareManager->update($share);
			}
		}

		return $this->executeGetData($movedPath);
	}

	/**
	 * Delete a file.
	 * @param string $path The file to delete.
	 */
	public function executeDelete($path) {
		$manager = $this->managers()->getManagerOf('file');
		$shareManager = $this->managers()->getManagerOf('sharedFile');
		$user = $this->app()->user();

		if ($user->isLogged()) {
			$internalPath = $manager->toInternalPath($path);
			$share = $shareManager->getByPath($user->id(), $internalPath);

			if (!empty($share) && $internalPath == $share['path']) {
				$shareManager->delete($share['id']);
			}
		}

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

	public function executeShare($path) {
		$manager = $this->managers()->getManagerOf('file');
		$shareManager = $this->managers()->getManagerOf('sharedFile');
		$user = $this->app()->user();

		if (!$user->isLogged()) {
			throw new \RuntimeException('You must be logged in to share a file');
		}

		$path = $manager->beautifyPath($path);

		if ($path != '~' && substr($path, 0, 2) != '~/') {
			throw new \RuntimeException('Cannot share files outside home directory (attempted to share file "'.$path.'")');
		}

		$share = $shareManager->getByPath($user->id(), $manager->toInternalPath($path));
		if (empty($share)) {
			$shareKey = substr(sha1(microtime() + mt_rand() * (mt_rand() + 42)), 4, 20); //Let's generate a funny key !

			$share = new \lib\entities\SharedFile(array(
				'userId' => $user->id(),
				'path' => $manager->toInternalPath($path),
				'key' => $shareKey
			));

			$shareManager->insert($share);
		}

		$shareUrl = $manager->toInternalPath($path) . '?key=' . $share['key'];

		if ($manager->isDir($path)) {
			$shareUrl .= '&dl=1';
		}

		return array('url' => $shareUrl);
	}

	public function executeSearch($query, $inDir) { //WARNING: doesn't support deep permissions check
		$manager = $this->managers()->getManagerOf('file');

		if ($inDir != '~' && substr($inDir, 0, 2) != '~/') {
			throw new \RuntimeException('Cannot search files outside home directory (attempted to search in directory "'.$inDir.'")');
		}

		//Escape the query string
		$escapedQuery = preg_quote(trim($query));
		$escapedQuery = str_replace(' ', '|', $escapedQuery); //" " = OR

		if (empty($escapedQuery)) { //Empty query
			throw new \RuntimeException('Empty search query');
		}

		$filesInDir = $manager->readDir($inDir, true);

		$matchingItems = array();

		foreach($filesInDir as $filepath) {
			$matchesNbr = preg_match_all('#('.$escapedQuery.')#i', $manager->basename($filepath));

			if ($matchesNbr > 0) {
				$matchingItem = $this->executeGetData($filepath);
				$matchingItem['matchesNbr'] = $matchesNbr;
				$matchingItems[] = $matchingItem;
			}
		}

		usort($matchingItems, function($a, $b) {
			return $b['matchesNbr'] - $a['matchesNbr'];
		});

		return $matchingItems;
	}
}