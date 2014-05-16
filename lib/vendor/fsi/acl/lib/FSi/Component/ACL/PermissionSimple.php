<?php

namespace FSi\Component\ACL;

class PermissionSimple implements PermissionInterface
{
    protected $id;

    protected static $permissions = array();

    protected function __construct($id)
    {
        $this->id = (string)$id;
    }

    public static function factory($id)
    {
        $id = (string)$id;
        if (!isset(static::$permissions[$id])) {
            static::$permissions[$id] = new static($id);
        }
        return static::$permissions[$id];
    }

    public function __toString()
    {
        return $this->id;
    }
}
