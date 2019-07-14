MyBC
====

Brief example
-------------

In the command line:

```
npm install -g @jbuhacoff/mybc
git clone https://github.com/bcgit/bc-java && cd bc-java
mybc prebuild
export JDKPATH="$JAVA_HOME"
./build15+
mybc postbuild
```

In your Maven project:

```
<dependency>
    <groupId>my.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.62</version>
</dependency>
```

The example only show `bcprov` but the tool builds all the BC jars:
`bcmail`, `bcpg`, `bcpkix`, `bcprov-ext`, `bcprov`, `bctest`, and `bctls`.

Dependencies
------------

NodeJS 10+ and NPM to install `mybc`.

Git to clone the BouncyCastle source code from GitHub.

Java 8, Ant, and Maven to build BouncyCastle.


Background
----------

Some projects need to use a recent version of BouncyCastle in an 
environment where the Java framework (web server, Android, etc.) already has an
earlier version of BouncyCastle in the classpath, which is loaded before the
application's version.

If you have a similar situation, you might see errors like this one at runtime:

```
java.security.NoSuchAlgorithmException: no such algorithm: SHA256withRSA/PSS for provider BC
```

This happens because at runtime your application is linked to the system's earlier version
of BouncyCastle that does not support that algorithm, and the version that you bundled
with your application is ignored.

A workaround is to rename the BouncyCastle
packages and the "BC" provider name so they won't conflict
with the pre-installed earlier BouncyCastle version.

The `mybc` tool automates the process so you can easily generate modified `.jar`
files to use in your project.

An existing project [SpongyCastle](https://github.com/rtyley/spongycastle) did
this and even published the resulting artifacts to Maven Central, but 
at the time of this writing, hasn't been updated for two years and is several 
versions behind BouncyCastle. It's not clear if that effort will
[continue](https://github.com/rtyley/spongycastle/issues/34), and anyway there is
another issue which might inhibit you from using it: you trust BouncyCastle --
but should you extend that trust to altered binaries published by someone else?

So the approach here is to make it easy for you to implement the same workaround
using your own copy of the BouncyCastle source code. 
The tool itself is simple and the source is on GitHub with a BSD 2-clause license.
You can inspect the source for assurance that it only does what it's intended to do,
and you can fork this repository and customize it as needed.


Customize
---------


You can specify the following options to `mybc prebuild`, shown here with the default values:

* `--providerName MyBC` the custom provider name to use in your application
* `--packageName my.bouncycastle` the custom Java package name to use in your application
* `--displayName MyBouncyCastle` the human-readable name for this custom version of BouncyCastle

You can specify the following options to `mybc postbuild`, shown here with the default values:

* `--groupId my.bouncycastle` used to install the customized jars in the local Maven repository

Here is a complete example with the default values specified:

```
mybc prebuild --providerName MyBC --packageName my.bouncycastle --displayName MyBouncyCastle
export JDKPATH="$JAVA_HOME"
./build15+
mybc postbuild --groupId my.bouncycastle
```

In your Maven project:

```
<dependency>
    <groupId>my.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.62</version>
</dependency>
```


SpongyCastle
------------

If you're already using SpongyCastle, here is how to create a drop-in replacement
with a newer version (the artifactIds may differ so you will need to update
this in your dependency management system):

```
mybc prebuild --providerName SC --packageName org.spongycastle --displayName SpongyCastle
./build15+
mybc postbuild --groupId com.madgag.spongycastle
```

In your Maven project:

```
<dependency>
    <groupId>com.madgag.spongycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.62</version>
</dependency>
```


Related
-------

Very old threads about the classpath issue on Android:

http://bouncy-castle.1462172.n4.nabble.com/Bouncy-Castle-and-Android-td1467774.html

http://bouncy-castle.1462172.n4.nabble.com/Removing-BC-from-Android-td2074914.html

Discussion about whether to continue releasing SpongyCastle:

https://github.com/rtyley/spongycastle/issues/34
