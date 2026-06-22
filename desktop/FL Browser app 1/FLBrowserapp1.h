#pragma once
#include <QDebug>
#include <QtWidgets/QDockWidget>
#include <QtWidgets/QMainWindow>
#include <QLabel>
#include <QTreeView>
#include <QFileSystemModel>
#include <QMediaPlayer>
#include <QAudioOutput>
#include <QVideoWidget>
#include <QPushButton>
#include <QTimer>
#include <QHBoxLayout>
#include <QHeaderView>
#include <QVBoxLayout>
#include <QFileInfo>



class FLBrowserapp1 : public QMainWindow
{
    Q_OBJECT

public:
    FLBrowserapp1(QWidget *parent = nullptr);
    ~FLBrowserapp1();

private:
    bool switching = false;
    QDockWidget* widget;
    QTreeView* yourTreeView;
    QFileSystemModel* files;
    QMediaPlayer* player;
    QAudioOutput* audioOutput;
    QVideoWidget* vidPlayer;
    QWidget* audioPreview;
    QTimer* previewTimer;
    QWidget* titleBar;
    QLabel* titleLabel;
    QPushButton* minimizeBtn;
    QPushButton* maximizeBtn;
    QPushButton* closeBtn;
    QLabel* previewLabel;
    QLabel* previewLayout;


private slots:

    void clickedFile(const QModelIndex& index);
    void onPlaybackChanged(QMediaPlayer::PlaybackState state);
    void onVideoAvailable(bool available);
    void minimizeWindow();
    void maximizeWindow();
    void closeWindow();
};


