/********************************************************************************
** Form generated from reading UI file 'FLBrowserapp1.ui'
**
** Created by: Qt User Interface Compiler version 6.11.1
**
** WARNING! All changes made in this file will be lost when recompiling UI file!
********************************************************************************/

#ifndef UI_FLBROWSERAPP1_H
#define UI_FLBROWSERAPP1_H

#include <QtCore/QVariant>
#include <QtWidgets/QApplication>
#include <QtWidgets/QMainWindow>
#include <QtWidgets/QMenuBar>
#include <QtWidgets/QStatusBar>
#include <QtWidgets/QToolBar>
#include <QtWidgets/QWidget>

QT_BEGIN_NAMESPACE

class Ui_FLBrowserapp1Class
{
public:
    QMenuBar *menuBar;
    QToolBar *mainToolBar;
    QWidget *centralWidget;
    QStatusBar *statusBar;

    void setupUi(QMainWindow *FLBrowserapp1Class)
    {
        if (FLBrowserapp1Class->objectName().isEmpty())
            FLBrowserapp1Class->setObjectName("FLBrowserapp1Class");
        FLBrowserapp1Class->resize(600, 400);
        menuBar = new QMenuBar(FLBrowserapp1Class);
        menuBar->setObjectName("menuBar");
        FLBrowserapp1Class->setMenuBar(menuBar);
        mainToolBar = new QToolBar(FLBrowserapp1Class);
        mainToolBar->setObjectName("mainToolBar");
        FLBrowserapp1Class->addToolBar(mainToolBar);
        centralWidget = new QWidget(FLBrowserapp1Class);
        centralWidget->setObjectName("centralWidget");
        FLBrowserapp1Class->setCentralWidget(centralWidget);
        statusBar = new QStatusBar(FLBrowserapp1Class);
        statusBar->setObjectName("statusBar");
        FLBrowserapp1Class->setStatusBar(statusBar);

        retranslateUi(FLBrowserapp1Class);

        QMetaObject::connectSlotsByName(FLBrowserapp1Class);
    } // setupUi

    void retranslateUi(QMainWindow *FLBrowserapp1Class)
    {
        FLBrowserapp1Class->setWindowTitle(QCoreApplication::translate("FLBrowserapp1Class", "FLBrowserapp1", nullptr));
    } // retranslateUi

};

namespace Ui {
    class FLBrowserapp1Class: public Ui_FLBrowserapp1Class {};
} // namespace Ui

QT_END_NAMESPACE

#endif // UI_FLBROWSERAPP1_H
