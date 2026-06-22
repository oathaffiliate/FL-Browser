#include "FLBrowserapp1.h"
#include <QtWidgets/QApplication>
#include <iostream>


int main(int argc, char* argv[])
{
	QApplication app(argc, argv);
	FLBrowserapp1 window;

	window.show();
	return app.exec();

} 